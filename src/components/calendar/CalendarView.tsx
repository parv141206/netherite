"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  X,
  List,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { api } from "~/trpc/react";
import { signIn } from "next-auth/react";
import type { CalendarEventItem } from "~/server/googleCalendar";

interface CalendarViewProps {
  onOpenNote?: (noteId: string) => void;
  onRefreshNotes?: () => void;
  onClose?: () => void;
}

type ViewMode = "month" | "week" | "day" | "agenda";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarView({ onOpenNote, onRefreshNotes, onClose }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingNoteForId, setCreatingNoteForId] = useState<string | null>(null);

  // Form State for Quick Event Creation
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(() => formatLocalDate(new Date()));
  const [newEventStartTime, setNewEventStartTime] = useState("10:00");
  const [newEventEndTime, setNewEventEndTime] = useState("11:00");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventAttendees, setNewEventAttendees] = useState("");

  // tRPC Queries & Mutations
  const utils = api.useUtils();
  const { data, isLoading, isError, error, refetch, isFetching } = api.calendar.listEvents.useQuery(
    undefined,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const createEventMutation = api.calendar.createEvent.useMutation({
    onSuccess: () => {
      utils.calendar.listEvents.invalidate();
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const deleteEventMutation = api.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      utils.calendar.listEvents.invalidate();
      setSelectedEvent(null);
    },
  });

  const createMeetingNoteMutation = api.calendar.createMeetingNote.useMutation({
    onSuccess: (createdNote) => {
      setCreatingNoteForId(null);
      onRefreshNotes?.();
      if (createdNote?.id) {
        onOpenNote?.(createdNote.id);
      }
    },
    onError: () => {
      setCreatingNoteForId(null);
    },
  });

  const resetForm = () => {
    setNewEventTitle("");
    setNewEventLocation("");
    setNewEventDescription("");
    setNewEventAttendees("");
  };

  const events = data?.events || [];
  const needsReauth = data?.needsReauth;

  // Month Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYearString = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Days in month calculation
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateString: string;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        dateString: formatLocalDate(d),
      });
    }

    // Current month days
    const todayStr = formatLocalDate(new Date());
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      const dateString = formatLocalDate(d);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        dateString,
      });
    }

    // Next month padding to fill complete grid of 35 or 42
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        dateString: formatLocalDate(d),
      });
    }

    return days;
  }, [currentDate]);

  // Filter events by day
  const getEventsForDay = (dateString: string) => {
    return events.filter((e) => {
      let startDay = "";
      if (e.start.includes("T")) {
        try {
          startDay = formatLocalDate(new Date(e.start));
        } catch {
          startDay = e.start.split("T")[0] || "";
        }
      } else {
        startDay = e.start;
      }
      return startDay === dateString;
    });
  };

  // 1-Click Meeting Note creation
  const handleCreateMeetingNote = (event: CalendarEventItem) => {
    setCreatingNoteForId(event.id);
    createMeetingNoteMutation.mutate({
      eventId: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
      location: event.location,
      meetLink: event.meetLink,
      description: event.description,
      attendees: event.attendees?.map((a) => a.displayName || a.email || "").filter(Boolean),
    });
  };

  // Submit Quick Event
  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const startDateTime = `${newEventDate}T${newEventStartTime}:00`;
    const endDateTime = `${newEventDate}T${newEventEndTime}:00`;

    const attendeesList = newEventAttendees
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    createEventMutation.mutate({
      summary: newEventTitle.trim(),
      start: new Date(startDateTime).toISOString(),
      end: new Date(endDateTime).toISOString(),
      location: newEventLocation.trim() || undefined,
      description: newEventDescription.trim() || undefined,
      attendees: attendeesList.length > 0 ? attendeesList : undefined,
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Apple-Style Glassmorphic Calendar Header */}
      <header className="px-4 py-3 border-b border-border/80 bg-card/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Month Title & Nav */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {monthYearString}
            </h1>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 hover:bg-background rounded-md text-xs font-semibold text-foreground transition-all cursor-pointer"
              title="Jump to Today"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: View Switcher (Month / Agenda) */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 text-xs font-medium">
          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "month"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "agenda"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>

        {/* Right: Actions (Refresh & New Event) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-border/70 hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Sync with Google Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={() => {
              setSelectedEvent(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-border/70 hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Return to Notes"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Scope Warning / Re-authentication Banner */}
      {needsReauth && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Google Calendar access requires granting calendar permissions. Please sign in to link your Google Calendar.
            </span>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
            className="px-3 py-1 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors shrink-0"
          >
            Enable Calendar Access
          </button>
        </div>
      )}

      {/* Calendar Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main View: Month Grid or Agenda List */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {viewMode === "month" ? (
            <div className="flex-1 flex flex-col min-h-[500px]">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 border-b border-border/70 bg-muted/20 text-center py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* 35 or 42 Days Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 divide-x divide-y divide-border/60">
                {calendarGrid.map((day, idx) => {
                  const dayEvents = getEventsForDay(day.dateString);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setNewEventDate(day.dateString);
                        setSelectedEvent(null);
                        setIsCreateModalOpen(true);
                      }}
                      className={`min-h-[75px] sm:min-h-[105px] p-1 sm:p-1.5 flex flex-col transition-colors cursor-pointer ${
                        day.isCurrentMonth
                          ? "bg-background hover:bg-accent/20"
                          : "bg-muted/15 text-muted-foreground/50"
                      }`}
                    >
                      {/* Day Number Badge */}
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-semibold ${
                            day.isToday
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : day.isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground/80 px-1">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
                        {dayEvents.slice(0, 3).map((event) => {
                          const isSelected = selectedEvent?.id === event.id && !isCreateModalOpen;
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateModalOpen(false);
                                setSelectedEvent(event);
                              }}
                              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium truncate flex items-center gap-1 sm:gap-1.5 transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                              }`}
                              title={event.summary}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              <span className="truncate">{event.summary}</span>
                            </div>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground font-medium pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          ) : (
            /* Agenda List View */
            <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-base font-bold text-foreground">Upcoming Agenda</h2>
                <span className="text-xs text-muted-foreground font-mono">{events.length} events loaded</span>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-xs text-muted-foreground">Loading calendar schedule...</div>
              ) : events.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground space-y-3">
                  <CalendarIcon className="w-10 h-10 mx-auto opacity-30" />
                  <div className="text-sm font-medium text-foreground">No events found</div>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your Google Calendar is free and open. Click New Event to schedule your first meeting.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const eventDate = new Date(event.start);
                    const formattedDate = eventDate.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const formattedTime = event.isAllDay
                      ? "All Day"
                      : eventDate.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          selectedEvent?.id === event.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-foreground/20 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 text-center w-14">
                            <div className="text-[10px] uppercase font-bold tracking-wider">
                              {eventDate.toLocaleDateString(undefined, { month: "short" })}
                            </div>
                            <div className="text-base font-extrabold leading-none mt-0.5">
                              {eventDate.getDate()}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {event.summary}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {formattedTime}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                              {event.meetLink && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Video className="w-3 h-3" />
                                  Google Meet
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 1-Click Note Generator */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateMeetingNote(event);
                            }}
                            disabled={creatingNoteForId === event.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer"
                            title="Generate Markdown Meeting Note in Drive"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {creatingNoteForId === event.id ? "Creating Note..." : "Meeting Note"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Detail Slide-Over / Inspector (Right Column) */}
        {selectedEvent && !isCreateModalOpen && (
          <aside className="w-full sm:w-80 md:w-96 border-l border-border bg-card/95 backdrop-blur-xl p-4 flex flex-col justify-between shrink-0 animate-in slide-in-from-right duration-200 absolute sm:relative inset-y-0 right-0 z-30 shadow-xl sm:shadow-none">
            <div className="space-y-4 overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-base text-foreground leading-snug">
                  {selectedEvent.summary}
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date */}
              <div className="space-y-1.5 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {new Date(selectedEvent.start).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="pl-5 font-mono text-[11px]">
                  {selectedEvent.isAllDay
                    ? "All Day Event"
                    : `${new Date(selectedEvent.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(selectedEvent.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </div>
              </div>

              {/* Google Meet Link */}
              {selectedEvent.meetLink && (
                <a
                  href={selectedEvent.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>Join Google Meet</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="break-words">{selectedEvent.location}</span>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Attendees ({selectedEvent.attendees.length})</span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedEvent.attendees.map((att, i) => (
                      <div key={i} className="text-xs text-foreground truncate pl-1">
                        {att.displayName ? `${att.displayName} (${att.email})` : att.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              {/* 1-Click Meeting Note Generation Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleCreateMeetingNote(selectedEvent)}
                  disabled={creatingNoteForId === selectedEvent.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {creatingNoteForId === selectedEvent.id ? "Creating Note..." : "Create Meeting Note (.md)"}
                  </span>
                </button>
              </div>
            </div>

            {/* Event Footer Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Calendar</span>
                </a>
              )}

              <button
                onClick={() => {
                  if (confirm("Delete this event from your Google Calendar?")) {
                    deleteEventMutation.mutate({ eventId: selectedEvent.id });
                  }
                }}
                disabled={deleteEventMutation.isPending}
                className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Quick Event Creation Slide-Over Panel (Right Column) */}
        {isCreateModalOpen && (
          <aside className="w-full sm:w-80 md:w-96 border-l border-border bg-card/95 backdrop-blur-xl flex flex-col justify-between shrink-0 animate-in slide-in-from-right duration-200 shadow-xl sm:shadow-none absolute sm:relative inset-y-0 right-0 z-30 overflow-hidden">
            <form onSubmit={handleCreateEventSubmit} className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">New Google Calendar Event</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. System Architecture / Sync"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="font-semibold text-muted-foreground block mb-1">Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newEventStartTime}
                        onChange={(e) => setNewEventStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-muted-foreground block mb-1">End Time</label>
                      <input
                        type="time"
                        value={newEventEndTime}
                        onChange={(e) => setNewEventEndTime(e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Location or Meeting Link</label>
                  <input
                    type="text"
                    placeholder="Google Meet, Zoom, or Room 402"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Attendees (comma separated)</label>
                  <input
                    type="text"
                    placeholder="team@example.com, prof@college.edu"
                    value={newEventAttendees}
                    onChange={(e) => setNewEventAttendees(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">Description / Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Agenda topics, notes, or references..."
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Panel Footer */}
              <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-1.5 bg-foreground text-background font-semibold text-xs rounded-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createEventMutation.isPending ? "Adding..." : "Add to Google Calendar"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
