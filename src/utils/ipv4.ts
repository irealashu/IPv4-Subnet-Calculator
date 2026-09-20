import {
  SubnetResult,
  VlsmRequirement,
  VlsmResult,
  VlsmAllocatedSubnet,
  RouteSummaryResult,
  OverlapItem,
  OverlapCheckResult,
  CidrMatrixItem
} from '../types/network';

// Converts dotted decimal IPv4 string to 32-bit unsigned number
export function ipToUint(ip: string): number {
  const octets = ip.trim().split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    throw new Error('Invalid IPv4 address');
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

// Converts 32-bit unsigned number to dotted decimal IPv4
export function uintToIp(uint: number): string {
  return [
    (uint >>> 24) & 255,
    (uint >>> 16) & 255,
    (uint >>> 8) & 255,
    uint & 255
  ].join('.');
}

// Convert CIDR prefix (0-32) to 32-bit uint mask
export function cidrToUintMask(cidr: number): number {
  if (cidr === 0) return 0;
  return ((0xffffffff << (32 - cidr)) >>> 0);
}

// Convert CIDR prefix to dotted decimal mask
export function cidrToMask(cidr: number): string {
  return uintToIp(cidrToUintMask(cidr));
}

// Convert dotted decimal mask to CIDR
export function maskToCidr(mask: string): number {
  const uint = ipToUint(mask);
  let bits = 0;
  let startedZero = false;
  for (let i = 31; i >= 0; i--) {
    const bit = (uint >>> i) & 1;
    if (bit === 1) {
      if (startedZero) throw new Error('Invalid non-contiguous subnet mask');
      bits++;
    } else {
      startedZero = true;
    }
  }
  return bits;
}

// Check if IP is valid IPv4
export function isValidIp(ip: string): boolean {
  try {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d+$/.test(p)) return false;
      const n = Number(p);
      return n >= 0 && n <= 255 && (p === '0' || !p.startsWith('0'));
    });
  } catch {
    return false;
  }
}

// Determine IP Class
export function getIpClass(firstOctet: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (firstOctet >= 1 && firstOctet <= 126) return 'A';
  if (firstOctet >= 128 && firstOctet <= 191) return 'B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'D';
  return 'E';
}

// Detailed RFC and category classification
export function getAddressClassification(ipUint: number): {
  category: string;
  isPrivate: boolean;
  rfc: string;
  description: string;
} {
  const o1 = (ipUint >>> 24) & 255;
  const o2 = (ipUint >>> 16) & 255;

  // 10.0.0.0/8 - RFC 1918 Private
  if (o1 === 10) {
    return {
      category: 'Private Network (Class A)',
      isPrivate: true,
      rfc: 'RFC 1918',
      description: 'Designated for internal private LANs; non-routable on the public internet.'
    };
  }

  // 172.16.0.0/12 - RFC 1918 Private
  if (o1 === 172 && o2 >= 16 && o2 <= 31) {
    return {
      category: 'Private Network (Class B)',
      isPrivate: true,
      rfc: 'RFC 1918',
      description: 'Designated for medium/large private organizational networks.'
    };
  }

  // 192.168.0.0/16 - RFC 1918 Private
  if (o1 === 192 && o2 === 168) {
    return {
      category: 'Private Network (Class C)',
      isPrivate: true,
      rfc: 'RFC 1918',
      description: 'Standard home and small business private LAN addresses.'
    };
  }

  // 127.0.0.0/8 - Loopback
  if (o1 === 127) {
    return {
      category: 'Loopback Host',
      isPrivate: true,
      rfc: 'RFC 1122',
      description: 'Internal host loopback interface (localhost communication).'
    };
  }

  // 169.254.0.0/16 - Link-Local / APIPA
  if (o1 === 169 && o2 === 254) {
    return {
      category: 'Link-Local (APIPA)',
      isPrivate: true,
      rfc: 'RFC 3927',
      description: 'Automatic Private IP Addressing used when DHCP server is unreachable.'
    };
  }

  // 100.64.0.0/10 - Shared Address Space (CGNAT)
  if (o1 === 100 && o2 >= 64 && o2 <= 127) {
    return {
      category: 'Carrier-Grade NAT (CGNAT)',
      isPrivate: true,
      rfc: 'RFC 6598',
      description: 'ISP Shared Address Space for Carrier-Grade NAT deployments.'
    };
  }

  // 224.0.0.0/4 - Multicast
  if (o1 >= 224 && o1 <= 239) {
    return {
      category: 'Multicast Group (Class D)',
      isPrivate: false,
      rfc: 'RFC 5771',
      description: 'Reserved for IP Multicast group transmissions (OSPF, RIPv2, streaming).'
    };
  }

  // 240.0.0.0/4 - Reserved
  if (o1 >= 240) {
    return {
      category: 'Reserved (Class E)',
      isPrivate: false,
      rfc: 'RFC 1112',
      description: 'Reserved for future experimental addressing research.'
    };
  }

  // 0.0.0.0/8 - Current Network
  if (o1 === 0) {
    return {
      category: 'Current Network (This Host)',
      isPrivate: true,
      rfc: 'RFC 1122',
      description: 'Source host during DHCP discovery or default route designation.'
    };
  }

  // Public IP
  return {
    category: 'Public Internet (Globally Routable)',
    isPrivate: false,
    rfc: 'RFC 791',
    description: 'Globally unique public IP routable across the global internet.'
  };
}

// Convert 32-bit uint to binary string formatted as 4 octets
export function uintToBinary(uint: number): string {
  const binary = (uint >>> 0).toString(2).padStart(32, '0');
  return `${binary.slice(0, 8)}.${binary.slice(8, 16)}.${binary.slice(16, 24)}.${binary.slice(24, 32)}`;
}

// Core Subnet Calculation
export function calculateSubnet(ipStr: string, cidr: number): SubnetResult {
  const cleanIp = ipStr.trim();
  if (!isValidIp(cleanIp)) {
    throw new Error('Please enter a valid IPv4 address (e.g. 192.168.1.1)');
  }
  if (cidr < 0 || cidr > 32 || isNaN(cidr)) {
    throw new Error('CIDR prefix must be an integer between 0 and 32');
  }

  const ipUint = ipToUint(cleanIp);
  const maskUint = cidrToUintMask(cidr);
  const wildcardUint = (~maskUint) >>> 0;
  const netUint = (ipUint & maskUint) >>> 0;
  const broadUint = (ipUint | wildcardUint) >>> 0;

  const totalHosts = Math.pow(2, 32 - cidr);
  let usableHosts = 0;
  let firstUsableUint = 0;
  let lastUsableUint = 0;

  if (cidr === 32) {
    usableHosts = 1;
    firstUsableUint = netUint;
    lastUsableUint = netUint;
  } else if (cidr === 31) {
    // RFC 3021 Point-to-Point links
    usableHosts = 2;
    firstUsableUint = netUint;
    lastUsableUint = broadUint;
  } else {
    usableHosts = Math.max(0, totalHosts - 2);
    firstUsableUint = (netUint + 1) >>> 0;
    lastUsableUint = (broadUint - 1) >>> 0;
  }

  const octets = cleanIp.split('.').map(Number);
  const ipClass = getIpClass(octets[0]);
  const addressType = getAddressClassification(ipUint);

  // Binary Breakdown per Octet with Network vs Host bits
  const binaryOctets = [];
  for (let i = 0; i < 4; i++) {
    const octetVal = (ipUint >>> ((3 - i) * 8)) & 255;
    const octetStartBit = i * 8;
    const octetEndBit = (i + 1) * 8;

    let netBitsInOctet = 0;
    if (cidr >= octetEndBit) {
      netBitsInOctet = 8;
    } else if (cidr > octetStartBit) {
      netBitsInOctet = cidr - octetStartBit;
    } else {
      netBitsInOctet = 0;
    }

    binaryOctets.push({
      networkBits: netBitsInOctet,
      hostBits: 8 - netBitsInOctet,
      binaryString: octetVal.toString(2).padStart(8, '0')
    });
  }

  // Reverse DNS PTR (e.g. 1.168.192.in-addr.arpa)
  const reverseDns = `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}.in-addr.arpa`;

  // Hexadecimal notation
  const hexIp = '0x' + (ipUint >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexMask = '0x' + (maskUint >>> 0).toString(16).toUpperCase().padStart(8, '0');

  // Relative scope percentage
  let hostsPercentageOfClass = '0%';
  if (ipClass === 'A') hostsPercentageOfClass = ((totalHosts / 16777216) * 100).toFixed(4) + '% of Class A';
  else if (ipClass === 'B') hostsPercentageOfClass = ((totalHosts / 65536) * 100).toFixed(4) + '% of Class B';
  else if (ipClass === 'C') hostsPercentageOfClass = ((totalHosts / 256) * 100).toFixed(2) + '% of Class C';

  return {
    ip: cleanIp,
    cidr,
    subnetMask: uintToIp(maskUint),
    wildcardMask: uintToIp(wildcardUint),
    networkAddress: uintToIp(netUint),
    broadcastAddress: uintToIp(broadUint),
    firstUsableHost: uintToIp(firstUsableUint),
    lastUsableHost: uintToIp(lastUsableUint),
    totalHosts,
    usableHosts,
    ipClass,
    addressType,
    binary: {
      ip: uintToBinary(ipUint),
      mask: uintToBinary(maskUint),
      network: uintToBinary(netUint),
      broadcast: uintToBinary(broadUint),
      octets: binaryOctets
    },
    hex: {
      ip: hexIp,
      mask: hexMask
    },
    integer: {
      ip: ipUint,
      mask: maskUint
    },
    reverseDns,
    slashNotation: `${uintToIp(netUint)}/${cidr}`,
    hostsPercentageOfClass
  };
}

// VLSM Calculation Engine
export function calculateVlsm(majorNetworkInput: string, majorCidrInput: number, requirements: VlsmRequirement[]): VlsmResult {
  if (!isValidIp(majorNetworkInput)) {
    throw new Error('Invalid Major Network address');
  }
  if (majorCidrInput < 1 || majorCidrInput > 30) {
    throw new Error('Major CIDR must be between /1 and /30');
  }

  const majorMask = cidrToUintMask(majorCidrInput);
  const majorBase = (ipToUint(majorNetworkInput) & majorMask) >>> 0;
  const totalMajorHosts = Math.pow(2, 32 - majorCidrInput);

  // Filter and sort requirements descending by needed hosts
  const sortedReqs = [...requirements]
    .filter(r => r.neededHosts > 0)
    .sort((a, b) => b.neededHosts - a.neededHosts);

  let currentIpUint = majorBase;
  const allocatedSubnets: VlsmAllocatedSubnet[] = [];
  let totalAllocatedHosts = 0;
  let totalRequestedHosts = 0;

  for (const req of sortedReqs) {
    totalRequestedHosts += req.neededHosts;

    // Determine required CIDR
    let hostBits = 1;
    if (req.neededHosts === 1) {
      hostBits = 2; // /30 has 2 usable
    } else if (req.neededHosts === 2) {
      hostBits = 2; // /30 or /31; standard enterprise uses /30 or /31
    } else {
      // Usable hosts = 2^n - 2 >= neededHosts -> 2^n >= neededHosts + 2
      hostBits = Math.ceil(Math.log2(req.neededHosts + 2));
    }
    const subnetCidr = 32 - hostBits;
    const blockSize = Math.pow(2, hostBits);

    // Check alignment
    if (currentIpUint % blockSize !== 0) {
      currentIpUint = (Math.ceil(currentIpUint / blockSize) * blockSize) >>> 0;
    }

    const netUint = currentIpUint;
    const broadUint = (netUint + blockSize - 1) >>> 0;
    const usableMin = (netUint + 1) >>> 0;
    const usableMax = (broadUint - 1) >>> 0;

    const usableCount = Math.max(0, blockSize - 2);
    const wasted = Math.max(0, usableCount - req.neededHosts);

    allocatedSubnets.push({
      id: req.id,
      name: req.name || `Subnet (${req.neededHosts} hosts)`,
      neededHosts: req.neededHosts,
      allocatedHosts: blockSize,
      usableHosts: usableCount,
      wastedHosts: wasted,
      cidr: subnetCidr,
      subnetMask: cidrToMask(subnetCidr),
      networkAddress: uintToIp(netUint),
      usableRange: `${uintToIp(usableMin)} - ${uintToIp(usableMax)}`,
      broadcastAddress: uintToIp(broadUint)
    });

    totalAllocatedHosts += blockSize;
    currentIpUint = (broadUint + 1) >>> 0;
  }

  const majorEndUint = (majorBase + totalMajorHosts - 1) >>> 0;
  const isOverCapacity = currentIpUint > majorEndUint + 1;
  const unallocatedHosts = Math.max(0, totalMajorHosts - totalAllocatedHosts);
  const utilizationPercentage = Math.min(100, (totalAllocatedHosts / totalMajorHosts) * 100);

  return {
    majorNetwork: uintToIp(majorBase),
    majorCidr: majorCidrInput,
    totalMajorHosts,
    allocatedSubnets,
    totalAllocatedHosts,
    totalRequestedHosts,
    unallocatedHosts,
    utilizationPercentage: Number(utilizationPercentage.toFixed(1)),
    isOverCapacity
  };
}

// Route Summarization / Supernetting Engine
export function summarizeRoutes(cidrList: string[]): RouteSummaryResult {
  const validCidrs: { ip: string; cidr: number; start: number; end: number }[] = [];

  for (const raw of cidrList) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const [ip, cidrStr] = trimmed.split('/');
    if (!isValidIp(ip) || !cidrStr || isNaN(Number(cidrStr))) {
      return {
        routes: cidrList,
        summarizedCidr: '',
        totalCoveredHosts: 0,
        originalRoutesCount: 0,
        reductionPercentage: 0,
        isValid: false,
        error: `Invalid CIDR format: "${trimmed}". Expected e.g. 192.168.1.0/24`
      };
    }
    const c = Number(cidrStr);
    if (c < 0 || c > 32) {
      return {
        routes: cidrList,
        summarizedCidr: '',
        totalCoveredHosts: 0,
        originalRoutesCount: 0,
        reductionPercentage: 0,
        isValid: false,
        error: `CIDR out of range: /${c}`
      };
    }
    const mask = cidrToUintMask(c);
    const start = (ipToUint(ip) & mask) >>> 0;
    const end = (start + Math.pow(2, 32 - c) - 1) >>> 0;
    validCidrs.push({ ip, cidr: c, start, end });
  }

  if (validCidrs.length === 0) {
    return {
      routes: [],
      summarizedCidr: '',
      totalCoveredHosts: 0,
      originalRoutesCount: 0,
      reductionPercentage: 0,
      isValid: false,
      error: 'Please enter at least one valid CIDR block'
    };
  }

  if (validCidrs.length === 1) {
    const single = validCidrs[0];
    return {
      routes: [cidrList[0]],
      summarizedCidr: `${uintToIp(single.start)}/${single.cidr}`,
      totalCoveredHosts: Math.pow(2, 32 - single.cidr),
      originalRoutesCount: 1,
      reductionPercentage: 0,
      isValid: true
    };
  }

  let minIp = 0xffffffff;
  let maxIp = 0;
  for (const item of validCidrs) {
    if (item.start < minIp) minIp = item.start;
    if (item.end > maxIp) maxIp = item.end;
  }

  // Find common bits between minIp and maxIp
  let commonBits = 0;
  for (let i = 31; i >= 0; i--) {
    const b1 = (minIp >>> i) & 1;
    const b2 = (maxIp >>> i) & 1;
    if (b1 === b2) {
      commonBits++;
    } else {
      break;
    }
  }

  const supernetMask = cidrToUintMask(commonBits);
  const supernetBase = (minIp & supernetMask) >>> 0;
  const summarizedCidr = `${uintToIp(supernetBase)}/${commonBits}`;
  const totalCoveredHosts = Math.pow(2, 32 - commonBits);
  const reductionPercentage = Math.round(((validCidrs.length - 1) / validCidrs.length) * 100);

  return {
    routes: validCidrs.map(v => `${uintToIp(v.start)}/${v.cidr}`),
    summarizedCidr,
    totalCoveredHosts,
    originalRoutesCount: validCidrs.length,
    reductionPercentage,
    isValid: true
  };
}

// Subnet Overlap / Conflict Checker
export function checkSubnetOverlaps(items: OverlapItem[]): OverlapCheckResult {
  const parsed = [];
  const conflicts: OverlapCheckResult['conflicts'] = [];
  let invalidCount = 0;

  for (const item of items) {
    const trimmed = item.cidr.trim();
    if (!trimmed) continue;
    const [ip, cidrStr] = trimmed.split('/');
    if (!isValidIp(ip) || !cidrStr || isNaN(Number(cidrStr))) {
      invalidCount++;
      continue;
    }
    const cidr = Number(cidrStr);
    if (cidr < 0 || cidr > 32) {
      invalidCount++;
      continue;
    }

    const mask = cidrToUintMask(cidr);
    const start = (ipToUint(ip) & mask) >>> 0;
    const end = (start + Math.pow(2, 32 - cidr) - 1) >>> 0;

    parsed.push({
      cidr: `${uintToIp(start)}/${cidr}`,
      name: item.name || trimmed,
      network: uintToIp(start),
      broadcast: uintToIp(end),
      startInt: start,
      endInt: end
    });
  }

  // Compare each pair
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];

      // Overlap if range A and range B intersect
      if (Math.max(a.startInt, b.startInt) <= Math.min(a.endInt, b.endInt)) {
        const overlapStart = Math.max(a.startInt, b.startInt);
        const overlapEnd = Math.min(a.endInt, b.endInt);
        conflicts.push({
          subnet1: `${a.name} (${a.cidr})`,
          subnet2: `${b.name} (${b.cidr})`,
          overlapRange: `${uintToIp(overlapStart)} - ${uintToIp(overlapEnd)}`,
          reason: `Addresses between ${uintToIp(overlapStart)} and ${uintToIp(overlapEnd)} collide directly.`
        });
      }
    }
  }

  let notice: string | undefined = undefined;
  if (parsed.length < 2) {
    notice = parsed.length === 0
      ? 'Please enter at least two valid CIDR blocks to detect collisions.'
      : 'Add at least one more subnet range to compare against.';
  }

  return {
    hasOverlap: conflicts.length > 0,
    notice,
    conflicts,
    validSubnets: parsed,
    invalidCount
  };
}

// Reference Matrix / Cheat Sheet Data (/0 to /32)
export function getCidrMatrixData(): CidrMatrixItem[] {
  const items: CidrMatrixItem[] = [];
  const notesMap: Record<number, string> = {
    0: 'Default Route (0.0.0.0/0) - All IPv4 space',
    8: 'Class A Full Block (e.g. 10.0.0.0/8)',
    10: 'Carrier-Grade NAT (RFC 6598 - 100.64.0.0/10)',
    12: 'Private Class B Range (172.16.0.0/12)',
    16: 'Class B Standard / Cloud VPC Standard (AWS, GCP, Azure)',
    20: 'Typical Large Cloud Subnet / Branch Aggregation',
    22: '1,024 Addresses / Corporate Campus VLAN',
    23: '512 Addresses / Dual /24 Subnet Pair',
    24: 'Class C Default / Most Common Office & Home LAN',
    25: 'Half Class C (128 addresses)',
    26: 'Quarter Class C (64 addresses / Small Office)',
    27: '32 Addresses (Common DMZ / Server VLAN)',
    28: '16 Addresses (Small Server Cluster / Edge Segment)',
    29: '8 Addresses (ISP Public Static IP Block, 5 Usable)',
    30: 'Point-to-Point Traditional Link (2 Usable Hosts)',
    31: 'RFC 3021 Point-to-Point Link (2 Usable Hosts, No Broadcast)',
    32: 'Single Host Route / Loopback Interface'
  };

  for (let c = 0; c <= 32; c++) {
    const mask = cidrToMask(c);
    const wildcard = uintToIp((~cidrToUintMask(c)) >>> 0);
    const totalHosts = Math.pow(2, 32 - c);
    let usable = 0;
    if (c === 32) usable = 1;
    else if (c === 31) usable = 2;
    else usable = Math.max(0, totalHosts - 2);

    let classType = 'CIDR Supernet';
    if (c === 8) classType = 'Class A Default';
    else if (c === 16) classType = 'Class B Default';
    else if (c === 24) classType = 'Class C Default';
    else if (c < 8) classType = 'Supernet / Core Route';
    else if (c > 24) classType = 'Sub-Class C';

    items.push({
      cidr: c,
      subnetMask: mask,
      wildcardMask: wildcard,
      totalHosts,
      usableHosts: usable,
      classType,
      notes: notesMap[c] || `Subnet mask 255... with /${c} prefix`
    });
  }
  return items;
}

// Device Config Generator
export function generateDeviceConfigs(subnet: SubnetResult, interfaceName: string = 'GigabitEthernet0/1'): Record<string, string> {
  const ip = subnet.firstUsableHost;
  const mask = subnet.subnetMask;
  const cidr = subnet.cidr;
  const net = subnet.networkAddress;
  const wildcard = subnet.wildcardMask;
  const broad = subnet.broadcastAddress;
  const lastIp = subnet.lastUsableHost;

  const isPointToPoint = cidr >= 31;
  const poolStartInt = isPointToPoint ? ipToUint(ip) : Math.min(ipToUint(lastIp), (ipToUint(ip) + 1) >>> 0);
  const poolStart = uintToIp(poolStartInt);

  const dhcpSnippet = isPointToPoint
    ? `# DHCP Scope is not applicable for /${cidr} (${cidr === 32 ? 'Single Host / Loopback' : 'RFC 3021 Point-to-Point Link'}).`
    : `# Standard DHCP Scope Definition
Subnet:            ${net}
Subnet Mask:       ${mask}
Router / Gateway:  ${ip}
Usable Pool Start: ${poolStart}
Usable Pool End:   ${lastIp}
Broadcast:         ${broad}
DNS Servers:       1.1.1.1, 8.8.8.8
Domain Name:       corp.local`;

  return {
    cisco_ios: `! Cisco IOS / Catalyst Configuration
configure terminal
interface ${interfaceName}
 description Connected to LAN_${net}_${cidr}
 ip address ${ip} ${mask}
 no shutdown
 exit
!
! Optional: DHCP Pool Configuration${isPointToPoint ? '\n! (Not applicable for /' + cidr + ' Point-to-Point/Host link)' : `
ip dhcp excluded-address ${ip}
ip dhcp pool POOL_${net.replace(/\\./g, '_')}
 network ${net} ${mask}
 default-router ${ip}
 dns-server 1.1.1.1 8.8.8.8
 lease 1 0 0
 exit`}`,

    juniper: `# Juniper JunOS Configuration
set interfaces ${interfaceName === 'GigabitEthernet0/1' ? 'ge-0/0/0' : interfaceName} unit 0 description "LAN-${net}/${cidr}"
set interfaces ${interfaceName === 'GigabitEthernet0/1' ? 'ge-0/0/0' : interfaceName} unit 0 family inet address ${ip}/${cidr}`,

    linux_ip: `# Linux iproute2 (immediate runtime configuration)
sudo ip addr add ${ip}/${cidr} dev eth0
sudo ip link set eth0 up

# Linux /etc/netplan/01-netcfg.yaml (Ubuntu / Debian persistent)
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - ${ip}/${cidr}
      routes:
        - to: default
          via: ${ip}
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]`,

    windows_ps: `# Windows PowerShell (Run as Administrator)
# Assign Static IP and Subnet
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress "${ip}" -PrefixLength ${cidr}
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("1.1.1.1","8.8.8.8")`,

    cisco_asa: `! Cisco ASA / Firepower Network Object
object network OBJ_${net.replace(/\\./g, '_')}_${cidr}
 subnet ${net} ${mask}
 description Subnet for ${subnet.addressType.category}
!
! NAT Rule example (Outbound PAT)
nat (inside,outside) after-auto source dynamic OBJ_${net.replace(/\\./g, '_')}_${cidr} interface`,

    cisco_acl: `! Cisco Standard & Extended ACL with Wildcard Mask
! Standard ACL (Match traffic from this subnet)
access-list 10 permit ${net} ${wildcard}
!
! Extended ACL (Permit Web Traffic from this subnet)
access-list 101 permit tcp ${net} ${wildcard} any eq 443
access-list 101 permit tcp ${net} ${wildcard} any eq 80
access-list 101 deny ip any any log`,

    dhcp_scope: dhcpSnippet
  };
}
