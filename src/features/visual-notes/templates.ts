/**
 * Curated reference templates for Visual Notes.
 */

export const CN_STUDY_TEMPLATE = `# Topic: Internet Protocol v4 (IPv4) [color: green]

## Addressing & CIDR
IPv4 operates on a 32-bit hierarchical address space providing approximately 4.3 billion unique identifiers. Addresses are structured as Network Prefix and Host ID. Modern routing relies on Classless Inter-Domain Routing (CIDR) slash notation (/24 = 255.255.255.0). Private address allocations defined in RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) prevent global address exhaustion and enable private enterprise subnets.

## Packet Header & Encapsulation
The standard IPv4 header is 20 bytes long without optional fields (up to 60 bytes with options). The 4-bit IHL field specifies header length in 32-bit words. Total Length supports datagrams up to 65,535 bytes. The Time-to-Live (TTL) field decrements at each forwarding router hop to prevent forwarding loops. Protocol field multiplexes Layer 4 payloads (6 for TCP, 17 for UDP, 1 for ICMP).

## Fragmentation & Reassembly
IPv4 handles unequal link-layer MTUs along an end-to-end path through fragmentation. The 16-bit Identification field pairs fragments from the same original datagram, while Flags and Fragment Offset dictate order.

### [flow] MTU Check & Fragment Splitting
When an outgoing packet exceeds the egress link Maximum Transmission Unit (typically 1500 bytes for standard Ethernet), the router verifies the Don't Fragment flag before slicing payload into MTU-compliant segments.

### [flow] Flags & Offset Alignment
The router sets More Fragments (MF=1) on all slices except the last (MF=0). The 13-bit Fragment Offset specifies the relative payload position measured strictly in 8-byte units to reconstruct the original datagram.

\`\`\`ascii: IPv4 Packet Header (20 Bytes Base)
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source IP Address                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination IP Address                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (0 to 40 bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Subnetting & Network Address Translation (NAT)
Subnetting divides address blocks into smaller collision and broadcast domains. NAT rewrites IP headers at the router boundary, allowing multiple internal hosts with private RFC 1918 IPs to share a single public IP. Port Address Translation (PAT / NAPT) tracks sessions via 16-bit ephemeral source ports, multiplexing thousands of concurrent external connections across one public IP address.

## Diagnostics & Control Protocols
Internet Control Message Protocol (ICMP) operates alongside IPv4 to communicate network layer errors and diagnostic metrics back to source hosts.

### [sub] ICMP Diagnostic Operations
- Ping sends ICMP Echo Requests (Type 8) expecting Echo Replies (Type 0) to verify bidirectional end-to-end reachability and measure Round-Trip Time (RTT).
- Traceroute transmits packets with incrementing TTL values (1, 2, 3...) to trigger ICMP Time Exceeded (Type 11) messages, mapping each transit router in the forwarding path.

# Topic: Transmission Control Protocol (TCP) [color: blue]

## Connection Lifecycle & State Machine
TCP is a connection-oriented, full-duplex protocol providing reliable stream transport. Sockets synchronize state using explicit handshakes before exchanging payload data, and transition through established states (LISTEN, SYN_SENT, ESTABLISHED, FIN_WAIT, TIME_WAIT).

### [flow] Three-Way Handshake
Client initiates with SYN (Seq=x). Server responds with SYN-ACK (Seq=y, Ack=x+1). Client completes handshake with ACK (Ack=y+1). Both hosts establish sequence baseline and initial receive windows.

### [flow] Four-Way Termination & TIME_WAIT
Active closer sends FIN. Passive receiver ACKs. Once application closes, receiver sends FIN. Final ACK from initiator triggers TIME_WAIT state (2 * MSL) ensuring late arriving segments drain before port reuse.

\`\`\`ascii: TCP Segment Header (20 Bytes Base)
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence Number                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Acknowledgment Number                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Data |           |U|A|P|R|S|F|                               |
| Offset| Reserved  |R|C|S|S|Y|I|          Window Size          |
|  (4b) |   (6b)    |G|K|H|T|N|N|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |         Urgent Pointer        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (0 to 40 bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Reliable Transmission & ARQ
TCP treats payload data as an unstructured stream of bytes. Sequence numbers track the first byte in each segment. The receiver issues cumulative ACKs indicating the next expected byte. If 3 duplicate ACKs arrive, Fast Retransmit immediately resends the missing segment without waiting for the Retransmission Timeout (RTO) timer to expire.

## Flow Control & Windowing
Flow control prevents a fast sender from overwhelming a slow receiver. The receiver advertises its available buffer capacity in the 16-bit Window Size field (rwnd). When rwnd drops to 0, sender stops transmitting and periodically emits Zero-Window Probes to detect when receiver buffer space clears. Window Scaling option (RFC 7323) shifts window size up to 1 GB.

## Congestion Control & Avoidance
TCP regulates network load via Congestion Window (cwnd) maintained by the sender. Transmission rate is throttled to min(cwnd, rwnd).

### [sub] AIMD & Rate Adaptation
- Slow Start exponentially doubles cwnd every RTT until reaching slow start threshold (ssthresh), rapidly discovering bottleneck bandwidth.
- Congestion Avoidance increments cwnd linearly by 1 MSS per RTT once past ssthresh, using Additive Increase Multiplicative Decrease (AIMD) to stabilize throughput.

# Topic: User Datagram Protocol (UDP) [color: amber]

## Stateless & Minimal Transport
UDP provides lightweight, connectionless datagram transport with zero state management. Unlike TCP, UDP executes no handshakes, maintains no socket buffer states, provides no retransmissions, and enforces no ordering or congestion backoff. Applications gain direct, raw transmission access to IP layer performance.

## Fixed 8-Byte Header Architecture
UDP features an ultra-compact 8-byte header minimizing packet overhead and serialization latency. It consists of four 16-bit fields: Source Port, Destination Port, Length (header + payload, min 8 bytes), and Checksum. The simple structure allows line-rate ASIC parsing in network hardware.

\`\`\`ascii: UDP Datagram Header (8 Bytes Fixed)
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|            Length             |            Checksum           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            Payload                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Error Detection & Checksum Mechanism
UDP computes an optional 16-bit one's complement checksum over a pseudo-header (Source IP, Destination IP, Protocol 17, UDP Length) combined with the header and payload. Corrupted datagrams are discarded silently without generating ACKs or error packets, delegating any recovery logic to user-space application protocols.

## Core Protocols & Production Use Cases
UDP powers real-time and foundational network infrastructure: DNS queries for instant domain resolution, DHCP for bootstrap host configuration, NTP for distributed clock synchronization, and WebRTC / RTP for real-time video conferencing where low latency supersedes packet retransmission.

## Protocol Trade-offs
Understanding when to select TCP versus UDP is fundamental to high-performance network system design.

### [sub] Architectural Comparison
- TCP guarantees reliable, in-order byte delivery with congestion throttling at the cost of 3-way handshake delay and head-of-line blocking stalls.
- UDP delivers unthrottled zero-latency datagrams with minimal packet overhead, serving as the modern foundation for HTTP/3 QUIC transport.
`;

export const REFERENCE_SKETCH_TEMPLATE = `# Topic: Main topic #1 [color: green]

## Sub topic #1
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #2
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [flow] Some flow about Sub Topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [flow] Some flow about Sub Topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

\`\`\`ascii: diagram for it
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence Number                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Acknowledgment Number                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Data |           |U|A|P|R|S|F|                               |
| Offset| Reserved  |R|C|S|S|Y|I|            Window             |
|  (4b) |   (6b)    |G|K|H|T|N|N|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |         Urgent Pointer        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (if any)                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Data (Payload)                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Sub topic #4
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [sub] Even sub sub topic
- lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque
- lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #5
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

# Topic: Main topic #2 [color: blue]

## Sub topic #1
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint...

## Sub topic #2
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint...
`;
