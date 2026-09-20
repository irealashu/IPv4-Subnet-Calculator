export interface SubnetResult {
  ip: string;
  cidr: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableHost: string;
  lastUsableHost: string;
  totalHosts: number;
  usableHosts: number;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  addressType: {
    category: string;
    isPrivate: boolean;
    rfc: string;
    description: string;
  };
  binary: {
    ip: string;
    mask: string;
    network: string;
    broadcast: string;
    octets: {
      networkBits: number;
      hostBits: number;
      binaryString: string;
    }[];
  };
  hex: {
    ip: string;
    mask: string;
  };
  integer: {
    ip: number;
    mask: number;
  };
  reverseDns: string;
  slashNotation: string;
  hostsPercentageOfClass: string;
}

export interface VlsmRequirement {
  id: string;
  name: string;
  neededHosts: number;
}

export interface VlsmAllocatedSubnet {
  id: string;
  name: string;
  neededHosts: number;
  allocatedHosts: number;
  usableHosts: number;
  wastedHosts: number;
  cidr: number;
  subnetMask: string;
  networkAddress: string;
  usableRange: string;
  broadcastAddress: string;
}

export interface VlsmResult {
  majorNetwork: string;
  majorCidr: number;
  totalMajorHosts: number;
  allocatedSubnets: VlsmAllocatedSubnet[];
  totalAllocatedHosts: number;
  totalRequestedHosts: number;
  unallocatedHosts: number;
  utilizationPercentage: number;
  isOverCapacity: boolean;
}

export interface RouteSummaryResult {
  routes: string[];
  summarizedCidr: string;
  totalCoveredHosts: number;
  originalRoutesCount: number;
  reductionPercentage: number;
  isValid: boolean;
  error?: string;
}

export interface OverlapItem {
  id: string;
  cidr: string;
  name: string;
}

export interface OverlapCheckResult {
  hasOverlap: boolean;
  notice?: string;
  conflicts: {
    subnet1: string;
    subnet2: string;
    overlapRange: string;
    reason: string;
  }[];
  validSubnets: {
    cidr: string;
    name: string;
    network: string;
    broadcast: string;
    startInt: number;
    endInt: number;
  }[];
  invalidCount?: number;
}

export interface CidrMatrixItem {
  cidr: number;
  subnetMask: string;
  wildcardMask: string;
  totalHosts: number;
  usableHosts: number;
  classType: string;
  notes: string;
}
