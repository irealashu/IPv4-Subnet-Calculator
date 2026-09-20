import React, { useState, useMemo, useEffect } from 'react';
import { calculateSubnet, generateDeviceConfigs, isValidIp } from '../utils/ipv4';
import { Terminal, Copy, Check, Sliders, Server, AlertCircle, Calculator, Layers } from 'lucide-react';

interface ConfigGeneratorProps {
  initialIp?: string;
  initialCidr?: number;
  onInspectSubnet?: (ip: string, cidr: number) => void;
  onPlanVlsm?: (ip: string, cidr: number) => void;
}

export const ConfigGenerator: React.FC<ConfigGeneratorProps> = ({
  initialIp = '192.168.10.1',
  initialCidr = 24,
  onInspectSubnet,
  onPlanVlsm
}) => {
  const [ip, setIp] = useState<string>(initialIp);
  const [cidr, setCidr] = useState<number>(initialCidr);
  const [interfaceName, setInterfaceName] = useState<string>('GigabitEthernet0/1');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('cisco_ios');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialIp) setIp(initialIp);
    if (initialCidr !== undefined) setCidr(initialCidr);
  }, [initialIp, initialCidr]);

  const subnet = useMemo(() => {
    try {
      if (!isValidIp(ip)) return null;
      return calculateSubnet(ip, cidr);
    } catch {
      return null;
    }
  }, [ip, cidr]);

  const configs = useMemo(() => {
    if (!subnet) return {};
    return generateDeviceConfigs(subnet, interfaceName);
  }, [subnet, interfaceName]);

  const currentSnippet = configs[selectedPlatform] || '';

  const copySnippet = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentSnippet);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { id: 'cisco_ios', label: 'Cisco IOS / Catalyst' },
    { id: 'juniper', label: 'Juniper JunOS' },
    { id: 'linux_ip', label: 'Linux (iproute2 & Netplan)' },
    { id: 'windows_ps', label: 'Windows PowerShell' },
    { id: 'cisco_asa', label: 'Cisco ASA Firewall' },
    { id: 'cisco_acl', label: 'Cisco ACL (Wildcard)' },
    { id: 'dhcp_scope', label: 'DHCP Scope Definition' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
          <Terminal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Device Configuration Generator
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Generate production-ready interface configs, ACL wildcard rules, DHCP scopes, and firewall objects for enterprise equipment.
        </p>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gateway / Interface IP
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value.trim())}
              placeholder="192.168.1.1"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              CIDR Prefix (/{cidr})
            </label>
            <input
              type="number"
              min="0"
              max="32"
              value={cidr}
              onChange={(e) => setCidr(Math.max(0, Math.min(32, Number(e.target.value))))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interface Name / Port
            </label>
            <input
              type="text"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              placeholder="GigabitEthernet0/1 or eth0"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Code Snippet Box with Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Platform Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-800/40 p-2 gap-1.5 scrollbar-none">
          {platforms.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedPlatform === p.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Snippet Output */}
        {subnet ? (
          <div className="p-6 relative bg-slate-950 text-slate-100 font-mono text-xs">
            <div className="absolute right-6 top-6 flex items-center space-x-2">
              {onInspectSubnet && (
                <button
                  onClick={() => onInspectSubnet(subnet.networkAddress, subnet.cidr)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Inspect in Subnet Calculator"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calculator</span>
                </button>
              )}
              {onPlanVlsm && (
                <button
                  onClick={() => onPlanVlsm(subnet.networkAddress, subnet.cidr)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Plan in VLSM Planner"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">VLSM</span>
                </button>
              )}
              <button
                onClick={copySnippet}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied Config!' : 'Copy Snippet'}</span>
              </button>
            </div>

            <pre className="overflow-x-auto pt-2 pb-4 leading-relaxed">
              <code>{currentSnippet}</code>
            </pre>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Invalid Interface IP Address
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Please enter a valid IPv4 address (e.g. 192.168.1.1) to generate configuration snippets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
