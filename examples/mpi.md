# Topic: Microprocessor Operations & Bus Cycles [color: cyan]

**Subject Code:** BE05000551 / 3160712 (Microprocessor and Interfacing - MPI)
**Standard References:** Ramesh S. Gaonkar (*Microprocessor Architecture, Programming, and Applications with the 8085*) + Darshan Institute GTU Notes (Unit 2) + GTU Past Examination Papers (2021–2025)

## Internal vs External System Operations
A microprocessor is an active digital logic device executing programs stored in memory. Its operations divide into two domains: Internal Operations executed within the CPU architecture (ALU operations, register transfers, flag updates, instruction decoding), and External Bus Operations communicating across system buses with memory chips and I/O peripherals.

## The Four Fundamental External Bus Operations
Every computer program reduces to four basic external bus cycles: Memory Read (IO/M'=0, RD'=0, WR'=1) to fetch opcodes and operands; Memory Write (IO/M'=0, RD'=1, WR'=0) to store results; I/O Read (IO/M'=1, RD'=0, WR'=1) to accept data from sensors/ports; and I/O Write (IO/M'=1, RD'=1, WR'=0) to output data to actuators/displays.

### [flow] Bus Read Communication Cycle
The microprocessor places a 16-bit address on the address bus to select the targeted memory location or I/O port via address decoders, asserts the active-low RD' strobe, and latches data driven onto D7-D0 into internal registers.

### [flow] Bus Write Communication Cycle
The CPU asserts the targeted 16-bit address, drives computed data onto data bus lines D7-D0, and emits an active-low WR' strobe pulse to latch the data byte permanently into the external device.

```ascii: Bus Communication Flowchart (Read Cycle)
+----------------+      1. Place 16-bit Address      +----------------------+
|                |==================================>|                      |
|                |                                   |  Memory / I/O Port   |
|                |      2. Assert RD' = 0 (Pulse)    |      Selection       |
|  Intel 8085    |---------------------------------->|   (Address Decoder)  |
| Microprocessor |                                   |                      |
|                |      3. Drive Data on Data Bus    |                      |
|                |<==================================|                      |
|                |              (D7 - D0)            +----------------------+
+----------------+
```

## Control Signals & Hardware Status Lines
The 8085 coordinates all bus activity using control and status signals: IO/M' designates whether the current cycle targets memory (0) or peripheral I/O (1). RD' coordinates read transfers and WR' coordinates write transfers. Together, these signals generate MEMR', MEMW', IOR', and IOW' strobes via external gating logic.

## Microprocessor Operations Architecture Hierarchy
The internal architecture executes register-to-register transfers, ALU arithmetic (+, -), logical bit manipulation (AND, OR, XOR), flag condition updates, and instruction decoding (IR to ID). External operations interface directly with memory arrays and peripheral controllers.

```ascii: Microprocessor Operations Hierarchy
+-----------------------------------------------------------------------------------+
|                        MICROPROCESSOR OPERATIONS HIERARCHY                        |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+---------------------------------+             +---------------------------------+
|       INTERNAL OPERATIONS       |             |   EXTERNAL (BUS) OPERATIONS     |
+---------------------------------+             +---------------------------------+
| • Register-to-Register Transfer |             | 1. Memory Read (Fetch Opcode /  |
| • Arithmetic Operations (+, -)  |             |    Read Data Operand)           |
| • Logical Operations (AND, OR)  |             | 2. Memory Write (Store Result)  |
| • Flag Status Register Updates  |             | 3. I/O Read (Read Input Port)   |
| • Instruction Decoding (IR->ID) |             | 4. I/O Write (Write Output Port)|
+---------------------------------+             +---------------------------------+
```

# Topic: Semiconductor Memory Classification & Cell Tech [color: green]

## Primary Semiconductor Memory Architecture
Semiconductor memory is an array of storage cells organized as words (bytes). Each location has a unique binary address. Primary memory is split into volatile Read/Write Random Access Memory (RAM) and non-volatile Read-Only Memory (ROM).

## Random Access Memory (RAM Technologies)
RAM permits both read and write access with identical access latency across all locations. It is volatile, losing data when power is removed.

### [flow] Static RAM (SRAM 6-Transistor Cell)
SRAM stores each bit in a bistable multi-transistor flip-flop (6 MOS transistors per cell). It requires no refresh cycles and offers ultra-fast access (10-30 ns), making it ideal for CPU caches (L1/L2/L3) and scratchpads despite higher cost and lower density.

### [flow] Dynamic RAM (DRAM 1-T 1-C Cell)
DRAM stores each bit as charge on a tiny MOS gate capacitance (1 transistor + 1 capacitor). Dielectric leakage requires periodic refresh cycles every 2-4 ms. It delivers massive density and low cost for main system RAM (DDR4/DDR5) with 50-100 ns access latency.

```ascii: Semiconductor Memory Classification Tree
+-----------------------------------------------------------------------------------+
|                           MEMORY CLASSIFICATION TREE                              |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+---------------------------------+             +---------------------------------+
|   PRIMARY SEMICONDUCTOR MEMORY  |             |    SECONDARY STORAGE (MASS)     |
+---------------------------------+             +---------------------------------+
         |                                                       |
   +-----+-----+                                           +-----+-----+
   |           |                                           |           |
   v           v                                           v           v
+-----+     +-----+                                     +-------+   +-------+
| RAM |     | ROM |                                     |MAGNETIC|  |OPTICAL|
+-----+     +-----+                                     +-------+   +-------+
   |           |                                            |           |
   |-- SRAM    |-- Masked ROM                               |-- HDD     |-- CD-ROM
   |-- DRAM    |-- PROM                                     |-- Tape    |-- CD-R
               |-- EPROM                                                |-- CD-RW
               |-- EEPROM                                               |-- DVD
               |-- Flash Memory
```

## Read-Only Memory (ROM Technologies)
ROM retains data permanently without electrical power. Masked ROM is factory-programmed via photolithography masks for mass firmware. PROM uses fusible links burned once by high-current pulses. EPROM uses floating-gate charge traps erased by exposing its quartz window to UV light (253.7 nm) for 20 minutes. EEPROM supports byte-level electrical erasure via Fowler-Nordheim tunneling. Flash Memory wipes data in large 4 KB to 64 KB blocks for high throughput in SSDs and BIOS chips.

## Memory Cell Transistor Circuit Topologies
The physical silicon topologies define speed and density trade-offs: SRAM uses cross-coupled inverters with word line gates, while DRAM uses a single pass-transistor gating storage charge into a microscopic cell capacitor.

```ascii: SRAM vs DRAM Cell Schematics
        SRAM Cell (6-Transistor Flip-Flop)            DRAM Cell (1-T, 1-C Capacitor)
               Vcc                                                Bit Line
                |                                                    |
          +-----+-----+                                              |
          |           |                                              |
       [T1/T2]     [T3/T4]                                     [Transistor]
       Inverter    Inverter                                          |
          |           |                                              +---[Capacitor]--- GND
       (Node Q)----(Node Q')                                         |
          |           |                                           Word Line
       [T5/T6]     [T5/T6] (Word Line Gates)
          |           |
       Bit Line   Bit Line'
```

# Topic: Memory Capacity & Address Line Calculations [color: violet]

## Fundamental Addressability Formulation
The relationship between address lines (N) and uniquely addressable memory locations (M) is strictly M = 2^N. With byte-wide storage (8 bits/location), total capacity equals 2^N bytes. 10 lines address 1 KB (1024 B), 12 lines address 4 KB (4096 B), 16 lines address 64 KB (full 8085 space), and 20 lines address 1 MB (full 8086 space).

## Address Range & Boundary Determination
Given starting address S in hexadecimal and memory capacity C in bytes, the ending address is E = S + C - 1. The minus-one term is mandatory because the starting address byte is itself the first addressable location.

## Solved Exam Numericals (8 KB and 2 KB Ranges)
Problem 1: An 8 KB memory (capacity 2000H) starting at 2000H spans from 2000H to (2000H + 2000H - 1) = 3FFFH. Problem 2: A 2 KB memory (capacity 0800H) starting at 8000H spans from 8000H to (8000H + 0800H - 1) = 87FFH.

## 16 KB Multi-Chip Interfacing Design
A 16 KB microcomputer system built from 4 KB x 8 chips requires: Number of chips = (16 KB x 8) / (4 KB x 8) = 4 chips. Address lines per individual chip = 2^12 = 12 lines (A11-A0). Address lines for total 16 KB space = 2^14 = 14 lines (A13-A0).

### [flow] Memory Array Parallel Bus Connection (A11-A0)
Address lines A11 through A0 connect in parallel to all 4 memory chips to provide internal 12-bit word indexing across 4096 memory registers within each chip.

### [flow] Higher Address Line Decoding (A13-A12 via 74LS138)
Higher address lines A13 and A12 feed directly into a 2-to-4 line decoder (74LS138) to generate 4 distinct, mutually exclusive active-low Chip Enable (CE') strobe signals.

```ascii: Memory Capacity vs Address Line Mapping
+---------------+-------------------+----------------------+------------------------------------------+
| ADDRESS LINES | CAPACITY FORMULA  | TOTAL BYTES          | INDUSTRY UNIT NOTATION                   |
+---------------+-------------------+----------------------+------------------------------------------+
| N = 10 lines  | 2^10 bytes        | 1,024 bytes          | 1 Kilobyte (1 KB)                        |
| N = 11 lines  | 2^11 = 2 x 2^10   | 2,048 bytes          | 2 Kilobytes (2 KB)                       |
| N = 12 lines  | 2^12 = 4 x 2^10   | 4,096 bytes          | 4 Kilobytes (4 KB)                       |
| N = 13 lines  | 2^13 = 8 x 2^10   | 8,192 bytes          | 8 Kilobytes (8 KB)                       |
| N = 14 lines  | 2^14 = 16 x 2^10  | 16,384 bytes         | 16 Kilobytes (16 KB)                     |
| N = 15 lines  | 2^15 = 32 x 2^10  | 32,768 bytes         | 32 Kilobytes (32 KB)                     |
| N = 16 lines  | 2^16 = 64 x 2^10  | 65,536 bytes         | 64 Kilobytes (64 KB) -> Full 8085 Space  |
| N = 20 lines  | 2^20 = 1 x 2^20   | 1,048,576 bytes      | 1 Megabyte (1 MB) -> Full 8086 Space     |
+---------------+-------------------+----------------------+------------------------------------------+
```

# Topic: Peripheral Interfacing & Hardware Building Blocks [color: amber]

## Four Physical Constraints Mandating Interfacing
Peripherals cannot wire directly to the CPU bus due to four critical hardware constraints: 1. Speed Mismatch (CPU operates in sub-microsecond cycles while mechanical I/O takes milliseconds); 2. Signal & Voltage Incompatibility (TTL +5V vs 24V industrial or analog voltages); 3. Transient Data Bus (CPU output data is valid for only ~300 ns during T2-T3); 4. Bus Contention (unbuffered inputs would short-circuit the shared data bus).

## Input Port Interfacing: Tri-State Buffer (74LS244)
Input peripherals must connect through octal tri-state buffers (IC 74LS244). When active-low OE' is high, outputs remain in High-Impedance (Z), completely isolating the peripheral from the data bus. During an active I/O read cycle, address decoding and RD' assert OE'=0, cleanly routing port data onto D7-D0.

## Output Port Interfacing: Octal Latch (74LS373)
Output peripherals require transparent D-latches (IC 74LS373). Because CPU bus data persists for only ~300 ns, the latch captures data on the falling edge of WR' combined with device selection, holding output voltage levels indefinitely to drive external displays and actuators.

### [flow] Tri-State Active-Low Bus Access
During an I/O Read cycle, address decoder output gates with RD' to pulse the tri-state buffer OE' low, bridging peripheral lines to the CPU data bus for the precise duration of the T3 sampling phase.

### [flow] Latched Persistent Data Output
During an I/O Write cycle, the address decoder gates with WR' to pulse the latch clock pin, capturing transient data from D7-D0 and sustaining static output drive indefinitely.

```ascii: Hardware Building Blocks (Tri-State Buffer & Latch)
   INPUT PORT (Tri-State Buffer - 74LS244)          OUTPUT PORT (Latch - 74LS373)
   
        Peripheral Input Data                         CPU Data Bus (D7 - D0)
                 |                                               |
                 v                                               v
        +-----------------+                             +-----------------+
        |  Tri-State Gate |                             |    D-Latch      |
        +-----------------+                             +-----------------+
                 |                                               |
    Enable Pulse | (Active LOW)                     Clock Pulse  | (Falling Edge)
    from Address +----------------+                 from Address +----------------+
    Decoder & RD'                 |                 Decoder & WR'                 |
                 v                |                              v                |
         CPU Data Bus (D7-D0)     |                      Peripheral Output Pins   |
    (Enabled ONLY during Read)    |                 (Holds data continuously)     |
```

## Solved GTU Interfacing Questions
GTU Winter 2024: Latches provide essential temporary-to-static data holding for output peripherals, resolving data bus transient decay. Tri-state buffers eliminate electrical bus contention during multi-device input multiplexing by enforcing High-Impedance isolation until an authorized read strobe occurs.

# Topic: Memory-Mapped I/O vs. Peripheral-Mapped I/O [color: rose]

## Unified Memory-Mapped I/O Architecture
In Memory-Mapped I/O, peripherals are treated as memory registers. The system assigns a full 16-bit address (A15-A0) within the 64 KB memory map directly to each I/O port. The CPU asserts memory control signals: IO/M'=0, MEMR', and MEMW'. Accessible by all memory instructions (MOV r, M; LDA; STA; ADD M).

## Isolated Peripheral-Mapped I/O Architecture
In Peripheral-Mapped (Isolated) I/O, the CPU maintains two completely separate address spaces: 64 KB for Memory and 256 independent ports for I/O. Ports use 8-bit addresses (A7-A0 duplicated on A15-A8). The CPU asserts IO/M'=1, generating IOR' and IOW' strobes. Access is strictly limited to IN and OUT instructions passing through the Accumulator.

### [flow] Unified 16-Bit Memory-Mapped Addressing
CPU drives 16-bit address on A15-A0 with IO/M'=0. Any internal register (A, B, C, D, E, H, L) can serve as source or destination, and arithmetic/logical operations (ADD M, CMP M) execute directly on port data.

### [flow] Dedicated 8-Bit Isolated Port Addressing
CPU drives 8-bit port address with IO/M'=1. Data transfer is strictly restricted through Accumulator Register A via IN port_addr (10 T-states) and OUT port_addr (10 T-states), leaving the entire 64 KB address space available for RAM and ROM.

```ascii: Address Space Allocation Architecture
+-----------------------------------------------------------------------------------+
|                    ADDRESS SPACE ALLOCATION ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+
      MEMORY-MAPPED I/O (Unified Space)           ISOLATED I/O (Separated Spaces)
      
          FFFFH +-----------------+                   FFFFH +-----------------+
                |   RAM Memory    |                         |                 |
                |                 |                         |   64 KB Full    |
          8000H +-----------------+                         |   Memory Space  |
                | I/O Port Space  |                         |  (RAM and ROM)  |
          7FFFH +-----------------+                         |                 |
                |   ROM Memory    |                   0000H +-----------------+
                |                 |
          0000H +-----------------+                   FFH   +-----------------+
                                                            | 256 I/O Ports   |
          (Total Space = 64 KB Shared)                00H   +-----------------+
                                                            (Dedicated I/O Space)
```

## Master 8-Point Engineering Comparison Matrix
GTU Summer 2024 / 2025 (7 Marks): 1. Address Bus: 16-bit (A15-A0) vs 8-bit (A7-A0); 2. Capacity: 64 KB shared vs 256 isolated; 3. Control: IO/M'=0 (MEMR/MEMW) vs IO/M'=1 (IOR/IOW); 4. Instructions: All memory ops (MOV, LDA, STA, ADD M) vs IN/OUT only; 5. Target: Any register (A-L) vs Accumulator only; 6. Arithmetic: Direct ALU execution on ports vs Accumulator copy required; 7. Decoders: 16-bit complex vs 8-bit simple; 8. Speed: 13 T-states vs 10 T-states.