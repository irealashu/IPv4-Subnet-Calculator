import React, { useState, useMemo, useEffect } from 'react';
import { calculateVlsm, isValidIp } from '../utils/ipv4';
import { VlsmRequirement } from '../types/network';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  GitMerge,
  ShieldAlert,
  Terminal
} from 'lucide-react';

interface VlsmPlannerProps {
  initialMajorIp?: string;
  initialMajorCidr?: number;
  onInspectSubnet?: (ip: string, cidr: number) => void;
  onSelectForConfig?: (ip: string, cidr: number) => void;
  onSummarizeRoutes?: (routes: string[]) => void;
  onCheckOverlap?: (items: { id: string; cidr: string; name: string }[]) => void;
}

const INITIAL_REQUIREMENTS: VlsmRequirement[] = [
  { id: '1', name: 'Corporate Wi-Fi / Workstations', neededHosts: 180 },
  { id: '2', name: 'Server Farm & Storage VLAN', neededHosts: 60 },
  { id: '3', name: 'VoIP Telephony', neededHosts: 30 },
  { id: '4', name: 'DMZ Public Web Tier', neededHosts: 14 },
  { id: '5', name: 'Out-of-Band Management', neededHosts: 8 },
  { id: '6', name: 'Core-to-Edge Router P2P', neededHosts: 2 }
];

export const VlsmPlanner: React.FC<VlsmPlannerProps> = ({
  initialMajorIp = '10.100.0.0',
  initialMajorCidr = 23,
  onInspectSubnet,
  onSelectForConfig,
  onSummarizeRoutes,
  onCheckOverlap
}) => {
  const [majorIp, setMajorIp] = useState<string>(initialMajorIp);
  const [majorCidr, setMajorCidr] = useState<number>(initialMajorCidr);
  const [requirements, setRequirements] = useState<VlsmRequirement[]>(INITIAL_REQUIREMENTS);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialMajorIp) {
      setMajorIp(initialMajorIp);
    }
  }, [initialMajorIp]);

  useEffect(() => {
    if (initialMajorCidr !== undefined) {
      setMajorCidr(initialMajorCidr);
    }
  }, [initialMajorCidr]);

  const addRequirement = () => {
    const newId = String(Date.now());
    setRequirements(prev => [
      ...prev,
      { id: newId, name: `Subnet Segment ${prev.length + 1}`, neededHosts: 25 }
    ]);
  };

  const removeRequirement = (id: string) => {
    setRequirements(prev => prev.filter(r => r.id !== id));
  };

  const updateRequirement = (id: string, field: 'name' | 'neededHosts', value: string | number) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            [field]: field === 'neededHosts' ? Math.max(1, Number(value) || 0) : value
          };
        }
        return r;
      })
    );
  };

  const resetToTemplate = (type: 'enterprise' | 'cloud' | 'small') => {
    if (type === 'enterprise') {
      setMajorIp('10.100.0.0');
      setMajorCidr(23);
      setRequirements(INITIAL_REQUIREMENTS);
    } else if (type === 'cloud') {
      setMajorIp('172.20.0.0');
      setMajorCidr(20);
      setRequirements([
        { id: '1', name: 'Private App Subnet Zone A', neededHosts: 500 },
        { id: '2', name: 'Private App Subnet Zone B', neededHosts: 500 },
        { id: '3', name: 'Database Aurora Cluster', neededHosts: 120 },
        { id: '4', name: 'Public Ingress Load Balancers', neededHosts: 60 },
        { id: '5', name: 'Transit Gateway Attachments', neededHosts: 10 }
      ]);
    } else {
      setMajorIp('192.168.10.0');
      setMajorCidr(24);
      setRequirements([
        { id: '1', name: 'Staff LAN', neededHosts: 80 },
        { id: '2', name: 'Guest Wi-Fi', neededHosts: 40 },
        { id: '3', name: 'IP Cameras / CCTV', neededHosts: 20 },
        { id: '4', name: 'P2P Firewall Link', neededHosts: 2 }
      ]);
    }
  };

  const vlsmResult = useMemo(() => {
    try {
      if (!isValidIp(majorIp)) return null;
      return calculateVlsm(majorIp, majorCidr, requirements);
    } catch {
      return null;
    }
  }, [majorIp, majorCidr, requirements]);

  const copyMarkdownTable = () => {
    if (!vlsmResult) return;
    const header = '| Subnet Name | Needed | Allocated | CIDR | Mask | Network Address | Usable Range | Broadcast |\n|---|---|---|---|---|---|---|---|';
    const rows = vlsmResult.allocatedSubnets.map(s =>
      `| ${s.name} | ${s.neededHosts} | ${s.allocatedHosts} | /${s.cidr} | ${s.subnetMask} | ${s.networkAddress} | ${s.usableRange} | ${s.broadcastAddress} |`
    ).join('\n');
    const full = `### VLSM Allocation Plan for ${vlsmResult.majorNetwork}/${vlsmResult.majorCidr}\n\n${header}\n${rows}\n\nTotal Allocated: ${vlsmResult.totalAllocatedHosts} / ${vlsmResult.totalMajorHosts} (${vlsmResult.utilizationPercentage}%)\nUnallocated Spare: ${vlsmResult.unallocatedHosts} hosts`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(full);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    if (!vlsmResult) return;
    const rows = [
      ['Subnet Name', 'Needed Hosts', 'Allocated Block', 'Usable Hosts', 'Wasted Hosts', 'CIDR', 'Subnet Mask', 'Network ID', 'Usable Range', 'Broadcast ID'],
      ...vlsmResult.allocatedSubnets.map(s => [
        s.name,
        s.neededHosts,
        s.allocatedHosts,
        s.usableHosts,
        s.wastedHosts,
        `/${s.cidr}`,
        s.subnetMask,
        s.networkAddress,
        s.usableRange,
        s.broadcastAddress
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const dl = document.createElement('a');
    dl.setAttribute('href', encodeURI(csvContent));
    dl.setAttribute('download', `vlsm-plan-${vlsmResult.majorNetwork}_${vlsmResult.majorCidr}.csv`);
    dl.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                VLSM Subnet Allocation Planner
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Partition a parent network block into variable-length subnets without address collision or wasted space.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Templates:
            </span>
            <button
              onClick={() => resetToTemplate('enterprise')}
              className="px-2.5 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 transition-colors"
            >
              Enterprise Campus (/23)
            </button>
            <button
              onClick={() => resetToTemplate('cloud')}
              className="px-2.5 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 transition-colors"
            >
              Cloud 3-Tier VPC (/20)
            </button>
            <button
              onClick={() => resetToTemplate('small')}
              className="px-2.5 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 transition-colors"
            >
              Branch Office (/24)
            </button>
          </div>
        </div>

        {/* Major Network Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Major (Parent) Network Address
            </label>
            <input
              id="vlsm-major-ip"
              type="text"
              value={majorIp}
              onChange={(e) => setMajorIp(e.target.value.trim())}
              placeholder="10.0.0.0"
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Parent CIDR Prefix (/{majorCidr})
            </label>
            <input
              id="vlsm-major-cidr"
              type="number"
              min="8"
              max="30"
              value={majorCidr}
              onChange={(e) => setMajorCidr(Math.max(1, Math.min(30, Number(e.target.value))))}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Parent Capacity:</div>
            <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
              {Math.pow(2, 32 - majorCidr).toLocaleString()} <span className="text-xs text-slate-400 font-normal">addresses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subnet Requirements List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Required Subnets & Host Demands
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The engine automatically prioritizes largest subnets first according to standard VLSM allocation rules.
            </p>
          </div>
          <button
            id="vlsm-add-btn"
            onClick={addRequirement}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subnet</span>
          </button>
        </div>

        {/* Inputs List */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {requirements.map((req, index) => (
            <div
              key={req.id}
              className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
            >
              <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                #{index + 1}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={req.name}
                  onChange={(e) => updateRequirement(req.id, 'name', e.target.value)}
                  placeholder="Subnet description / VLAN name"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="w-40 flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="16777214"
                  value={req.neededHosts}
                  onChange={(e) => updateRequirement(req.id, 'neededHosts', e.target.value)}
                  className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-center font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  hosts
                </span>
              </div>
              <button
                onClick={() => removeRequirement(req.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
                title="Remove Subnet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation Results & Visualizer */}
      {vlsmResult && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Capacity Progress & Metric Bar */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Address Block Utilization:
                </span>
                <span className={`text-sm font-mono font-bold ${vlsmResult.isOverCapacity ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                  {vlsmResult.utilizationPercentage}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({vlsmResult.totalAllocatedHosts.toLocaleString()} of {vlsmResult.totalMajorHosts.toLocaleString()} addresses)
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {onSummarizeRoutes && vlsmResult.allocatedSubnets.length > 0 && (
                  <button
                    onClick={() => onSummarizeRoutes(vlsmResult.allocatedSubnets.map(s => `${s.networkAddress}/${s.cidr}`))}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    title="Send all planned VLSM subnets into Route Aggregator to calculate supernet"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    <span>Summarize Subnets</span>
                  </button>
                )}
                {onCheckOverlap && vlsmResult.allocatedSubnets.length > 0 && (
                  <button
                    onClick={() => onCheckOverlap(vlsmResult.allocatedSubnets.map(s => ({ id: s.id, cidr: `${s.networkAddress}/${s.cidr}`, name: s.name })))}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                    title="Verify allocated subnets in Overlap Detector"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Verify Overlap</span>
                  </button>
                )}
                <button
                  onClick={copyMarkdownTable}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied Table!' : 'Copy Markdown'}</span>
                </button>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, vlsmResult.utilizationPercentage)}%` }}
                className={`h-full transition-all ${
                  vlsmResult.isOverCapacity ? 'bg-red-500' : 'bg-blue-600 dark:bg-blue-500'
                }`}
              />
            </div>

            {/* Over capacity warning */}
            {vlsmResult.isOverCapacity && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <strong>Capacity Exceeded!</strong> Subnet requirements exceed the parent /{vlsmResult.majorCidr} block.
                  Increase parent network size to /{vlsmResult.majorCidr - 1} or decrease host allocations.
                </span>
              </div>
            )}
          </div>

          {/* Allocation Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Subnet Name</th>
                  <th className="py-3 px-4">Needed</th>
                  <th className="py-3 px-4">Allocated</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Subnet Mask</th>
                  <th className="py-3 px-4">Network ID</th>
                  <th className="py-3 px-4">Usable Host Range</th>
                  <th className="py-3 px-4">Broadcast ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {vlsmResult.allocatedSubnets.map((subnet) => (
                  <tr
                    key={subnet.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                      {subnet.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {subnet.neededHosts}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {subnet.allocatedHosts} <span className="text-[10px] text-slate-400 font-normal">({subnet.usableHosts} usable)</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      /{subnet.cidr}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {subnet.subnetMask}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {subnet.networkAddress}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {subnet.usableRange}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {subnet.broadcastAddress}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center space-x-1 justify-end">
                        {onInspectSubnet && (
                          <button
                            onClick={() => onInspectSubnet(subnet.networkAddress, subnet.cidr)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/80 dark:hover:text-blue-300 font-sans text-[11px] font-medium transition-colors"
                            title="Inspect in Subnet Calculator"
                          >
                            Inspect
                          </button>
                        )}
                        {onSelectForConfig && (
                          <button
                            onClick={() => onSelectForConfig(subnet.networkAddress, subnet.cidr)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/80 dark:hover:text-blue-300 font-sans text-[11px] font-medium transition-colors"
                            title="Generate Device Config"
                          >
                            <Terminal className="h-3 w-3 inline mr-1" />
                            Config
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Unallocated Space Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span>Unallocated Spare Space: </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {vlsmResult.unallocatedHosts.toLocaleString()} addresses
              </strong>
            </div>
            <div>
              <span>Total Subnets Allocated: </span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {vlsmResult.allocatedSubnets.length} subnets
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
