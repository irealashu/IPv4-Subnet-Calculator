import React, { useState, useEffect } from 'react';
import {
  calculateSubnet,
  cidrToMask,
  maskToCidr,
  isValidIp
} from '../utils/ipv4';
import { SubnetResult } from '../types/network';
import { BitVisualizer } from './BitVisualizer';
import {
  Copy,
  Check,
  Download,
  Share2,
  RotateCcw,
  Sparkles,
  Info,
  Server,
  Globe,
  Lock,
  Radio,
  Sliders,
  Terminal,
  Layers,
  ShieldAlert,
  GitMerge
} from 'lucide-react';

interface SubnetCalculatorProps {
  onSelectForConfig?: (result: SubnetResult) => void;
  onPlanVlsm?: (networkAddress: string, cidr: number) => void;
  onCheckOverlap?: (cidr: string) => void;
  onAddToSummarizer?: (cidr: string) => void;
  initialIpOverride?: string | null;
  initialCidrOverride?: number | null;
}

const PRESETS = [
  { label: 'Standard LAN (/24)', ip: '192.168.1.10', cidr: 24, desc: '254 hosts' },
  { label: 'Branch Office (/22)', ip: '10.50.0.1', cidr: 22, desc: '1,022 hosts' },
  { label: 'Cloud VPC (/16)', ip: '172.16.0.0', cidr: 16, desc: '65,534 hosts' },
  { label: 'WAN P2P (/30)', ip: '10.255.1.1', cidr: 30, desc: '2 hosts' },
  { label: 'RFC 3021 P2P (/31)', ip: '10.255.2.0', cidr: 31, desc: '2 hosts (no bcast)' },
  { label: 'Carrier NAT (/10)', ip: '100.64.0.1', cidr: 10, desc: 'RFC 6598' },
  { label: 'Host Route (/32)', ip: '192.168.1.100', cidr: 32, desc: 'Single Host' },
];

export const SubnetCalculator: React.FC<SubnetCalculatorProps> = ({
  onSelectForConfig,
  onPlanVlsm,
  onCheckOverlap,
  onAddToSummarizer,
  initialIpOverride,
  initialCidrOverride
}) => {
  const [ip, setIp] = useState<string>(() => initialIpOverride || localStorage.getItem('lastIP') || '192.168.1.10');
  const [cidr, setCidr] = useState<number>(() => {
    if (initialCidrOverride !== undefined && initialCidrOverride !== null) {
      return initialCidrOverride;
    }
    const saved = localStorage.getItem('lastCIDR');
    return saved ? Number(saved) : 24;
  });
  const [subnetMaskInput, setSubnetMaskInput] = useState<string>(() => cidrToMask(cidr));

  useEffect(() => {
    if (initialIpOverride) {
      setIp(initialIpOverride);
    }
  }, [initialIpOverride]);

  useEffect(() => {
    if (initialCidrOverride !== undefined && initialCidrOverride !== null) {
      setCidr(initialCidrOverride);
      setSubnetMaskInput(cidrToMask(initialCidrOverride));
    }
  }, [initialCidrOverride]);
  const [result, setResult] = useState<SubnetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculate whenever IP or CIDR changes
  useEffect(() => {
    try {
      setError(null);
      if (!isValidIp(ip)) {
        setError('Invalid IPv4 address format. Use 4 octets (0-255), e.g. 192.168.1.10');
        setResult(null);
        return;
      }
      const calc = calculateSubnet(ip, cidr);
      setResult(calc);
      setSubnetMaskInput(calc.subnetMask);
      localStorage.setItem('lastIP', ip);
      localStorage.setItem('lastCIDR', String(cidr));
    } catch (err: unknown) {
      setError((err as Error).message || 'Calculation error');
      setResult(null);
    }
  }, [ip, cidr]);

  // Handle mask change
  const handleMaskChange = (newMask: string) => {
    setSubnetMaskInput(newMask);
    try {
      const newCidr = maskToCidr(newMask);
      setCidr(newCidr);
      setError(null);
    } catch {
      // Allow user typing mask until valid
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
    } catch {
      // fallback
    }
    document.body.removeChild(el);
  };

  const copyAllSummary = () => {
    if (!result) return;
    const summary = [
      `=== IPv4 Subnet Calculation ===`,
      `IP Address:        ${result.ip}`,
      `CIDR Prefix:       /${result.cidr}`,
      `Subnet Mask:       ${result.subnetMask}`,
      `Wildcard Mask:     ${result.wildcardMask}`,
      `Network Address:   ${result.networkAddress}`,
      `Broadcast Address: ${result.broadcastAddress}`,
      `Usable Host Range: ${result.firstUsableHost} - ${result.lastUsableHost}`,
      `Usable Hosts:      ${result.usableHosts.toLocaleString()}`,
      `Total Hosts:       ${result.totalHosts.toLocaleString()}`,
      `IP Class:          Class ${result.ipClass}`,
      `Category:          ${result.addressType.category} (${result.addressType.rfc})`,
      `Binary IP:         ${result.binary.ip}`,
      `Binary Mask:       ${result.binary.mask}`,
      `Hex IP:            ${result.hex.ip}`,
      `Reverse DNS:       ${result.reverseDns}`
    ].join('\n');
    copyToClipboard(summary, 'all');
  };

  const exportJson = () => {
    if (!result) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `subnet-${result.networkAddress}_${result.cidr}.json`);
    dl.click();
  };

  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ['Property', 'Value'],
      ['IP Address', result.ip],
      ['CIDR Prefix', `/${result.cidr}`],
      ['Subnet Mask', result.subnetMask],
      ['Wildcard Mask', result.wildcardMask],
      ['Network Address', result.networkAddress],
      ['Broadcast Address', result.broadcastAddress],
      ['First Usable Host', result.firstUsableHost],
      ['Last Usable Host', result.lastUsableHost],
      ['Total Hosts', result.totalHosts],
      ['Usable Hosts', result.usableHosts],
      ['IP Class', result.ipClass],
      ['RFC Category', result.addressType.category],
      ['Reverse DNS', result.reverseDns]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => `"${e[0]}","${e[1]}"`).join('\n');
    const dl = document.createElement('a');
    dl.setAttribute('href', encodeURI(csvContent));
    dl.setAttribute('download', `subnet-${result.networkAddress}_${result.cidr}.csv`);
    dl.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Input & Presets Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              IPv4 CIDR Calculator
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Calculate network bounds, usable IP ranges, wildcard masks, and binary allocations in real-time.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Presets:
            </span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIp(p.ip);
                  setCidr(p.cidr);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* IP Input */}
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              IPv4 Address
            </label>
            <div className="relative">
              <input
                id="calc-ip-input"
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value.trim())}
                placeholder="e.g. 192.168.1.10"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <span className="absolute right-3 top-3 text-xs text-slate-400 font-mono">IPv4</span>
            </div>
          </div>

          {/* CIDR Prefix */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                CIDR Prefix
              </label>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                /{cidr}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="calc-cidr-input"
                type="number"
                min="0"
                max="32"
                value={cidr}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(32, Number(e.target.value)));
                  setCidr(val);
                }}
                className="w-20 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="range"
                min="0"
                max="32"
                value={cidr}
                onChange={(e) => setCidr(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Subnet Mask Field (Syncs both ways) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Subnet Mask
            </label>
            <input
              id="calc-mask-input"
              type="text"
              value={subnetMaskInput}
              onChange={(e) => handleMaskChange(e.target.value)}
              placeholder="255.255.255.0"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
            <Info className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Results Container */}
      {result && (
        <div className="space-y-6">
          {/* Key Metrics Header Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Usable Hosts
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {result.usableHosts.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400">
                Total: {result.totalHosts.toLocaleString()}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                IP Classification
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  Class {result.ipClass}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  result.addressType.isPrivate
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {result.addressType.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{result.addressType.rfc}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Subnet Mask
              </span>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white truncate" title={result.subnetMask}>
                {result.subnetMask}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Wildcard: {result.wildcardMask}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Network Identifier
              </span>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white truncate" title={result.slashNotation}>
                {result.slashNotation}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Broadcast: {result.broadcastAddress}
              </span>
            </div>
          </div>

          {/* Interactive 32-Bit Binary Visualizer */}
          <BitVisualizer subnet={result} />

          {/* Detailed Network Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Network Breakdown & Properties
                </h3>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {onSelectForConfig && (
                  <button
                    onClick={() => onSelectForConfig(result)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                    title="Generate router/firewall device configs for this subnet"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Device Configs</span>
                  </button>
                )}
                {onPlanVlsm && (
                  <button
                    onClick={() => onPlanVlsm(result.networkAddress, result.cidr)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
                    title="Plan subnets within this block using VLSM"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Plan in VLSM</span>
                  </button>
                )}
                {onCheckOverlap && (
                  <button
                    onClick={() => onCheckOverlap(result.slashNotation)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                    title="Check if this subnet overlaps or conflicts with other ranges"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Check Conflicts</span>
                  </button>
                )}
                {onAddToSummarizer && (
                  <button
                    onClick={() => onAddToSummarizer(result.slashNotation)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    title="Add this subnet to Route Summarizer"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    <span>Summarize</span>
                  </button>
                )}
                <button
                  onClick={copyAllSummary}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {copiedKey === 'all' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey === 'all' ? 'Copied All!' : 'Copy Summary'}</span>
                </button>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Export CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportJson}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Export JSON"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {/* Row 1: Network Address */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Network Address (ID)
                </div>
                <div className="md:col-span-7 font-mono font-bold text-slate-900 dark:text-white">
                  {result.networkAddress}
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.networkAddress, 'net')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy"
                  >
                    {copiedKey === 'net' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 2: Broadcast Address */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Broadcast Address
                </div>
                <div className="md:col-span-7 font-mono font-bold text-slate-900 dark:text-white">
                  {result.broadcastAddress}
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.broadcastAddress, 'bcast')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy"
                  >
                    {copiedKey === 'bcast' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 3: Usable Host Range */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors bg-blue-50/30 dark:bg-blue-950/20">
                <div className="md:col-span-4 font-semibold text-blue-700 dark:text-blue-300">
                  Usable Host Range
                </div>
                <div className="md:col-span-7 font-mono font-bold text-blue-800 dark:text-blue-200">
                  {result.firstUsableHost} <span className="text-slate-400 font-normal">through</span> {result.lastUsableHost}
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(`${result.firstUsableHost} - ${result.lastUsableHost}`, 'range')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy Range"
                  >
                    {copiedKey === 'range' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 4: Subnet Mask & Wildcard */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Subnet Mask & Wildcard
                </div>
                <div className="md:col-span-7 font-mono text-slate-900 dark:text-white">
                  <span className="font-bold">{result.subnetMask}</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span className="text-slate-500">Wildcard: {result.wildcardMask}</span>
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.subnetMask, 'mask')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy Mask"
                  >
                    {copiedKey === 'mask' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 5: Total & Usable Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Hosts Capacity
                </div>
                <div className="md:col-span-7 font-mono text-slate-900 dark:text-white">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {result.usableHosts.toLocaleString()} usable
                  </span>
                  <span className="text-slate-400 mx-2">/</span>
                  <span className="text-slate-500">{result.totalHosts.toLocaleString()} total (2^{32 - result.cidr})</span>
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(String(result.usableHosts), 'hosts')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {copiedKey === 'hosts' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 6: Address Scope & RFC */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Address Scope & RFC
                </div>
                <div className="md:col-span-7 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{result.addressType.category}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    {result.addressType.description}
                  </span>
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {result.addressType.rfc}
                  </span>
                </div>
              </div>

              {/* Row 7: Binary IP & Mask */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Binary Notation
                </div>
                <div className="md:col-span-7 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                  <div>IP:   <span className="font-bold">{result.binary.ip}</span></div>
                  <div>Mask: <span className="text-slate-500">{result.binary.mask}</span></div>
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.binary.ip, 'bin')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy Binary IP"
                  >
                    {copiedKey === 'bin' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 8: Hex & Integer */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Hex & 32-bit Integer
                </div>
                <div className="md:col-span-7 font-mono text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-purple-600 dark:text-purple-400">{result.hex.ip}</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span>Decimal Int: {result.integer.ip}</span>
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.hex.ip, 'hex')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy Hex"
                  >
                    {copiedKey === 'hex' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Row 9: Reverse DNS PTR */}
              <div className="grid grid-cols-1 md:grid-cols-12 px-6 py-3 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="md:col-span-4 font-semibold text-slate-600 dark:text-slate-400">
                  Reverse DNS (PTR Record)
                </div>
                <div className="md:col-span-7 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                  {result.reverseDns}
                </div>
                <div className="md:col-span-1 text-right">
                  <button
                    onClick={() => copyToClipboard(result.reverseDns, 'ptr')}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Copy PTR"
                  >
                    {copiedKey === 'ptr' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
