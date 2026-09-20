import React, { useState, useMemo, useEffect } from 'react';
import { checkSubnetOverlaps } from '../utils/ipv4';
import { OverlapItem } from '../types/network';
import { ShieldAlert, ShieldCheck, Plus, Trash2, AlertOctagon, Info, GitMerge, Terminal, ExternalLink } from 'lucide-react';

const INITIAL_OVERLAP_ITEMS: OverlapItem[] = [
  { id: '1', cidr: '10.100.0.0/16', name: 'Primary AWS VPC' },
  { id: '2', cidr: '10.100.32.0/19', name: 'On-Premises Headquarter' },
  { id: '3', cidr: '10.200.0.0/24', name: 'Branch Office Singapore' },
  { id: '4', cidr: '192.168.1.0/24', name: 'Management Remote Access' }
];

interface OverlapCheckerProps {
  initialItems?: OverlapItem[];
  onSummarizeRoutes?: (routes: string[]) => void;
  onInspectSubnet?: (ip: string, cidr: number) => void;
  onSelectForConfig?: (ip: string, cidr: number) => void;
}

export const OverlapChecker: React.FC<OverlapCheckerProps> = ({
  initialItems,
  onSummarizeRoutes,
  onInspectSubnet,
  onSelectForConfig
}) => {
  const [items, setItems] = useState<OverlapItem[]>(() => initialItems || INITIAL_OVERLAP_ITEMS);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(Date.now()), cidr: '10.100.1.0/24', name: `Network Segment ${prev.length + 1}` }
    ]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: 'name' | 'cidr', value: string) => {
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const result = useMemo(() => {
    return checkSubnetOverlaps(items);
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
          <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Subnet Conflict & Overlap Detector
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Validate whether disparate cloud VPCs, IPsec VPN tunnels, or enterprise subnets collide or overlap in address space before provisioning.
        </p>

        {/* Input Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Configured Subnet Ranges
            </span>
            <button
              onClick={addItem}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Network Block</span>
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
              >
                <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                  #{idx + 1}
                </span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="e.g. AWS VPC US-East"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-48">
                  <input
                    type="text"
                    value={item.cidr}
                    onChange={(e) => updateItem(item.id, 'cidr', e.target.value)}
                    placeholder="e.g. 10.0.0.0/16"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {item.cidr && item.cidr.includes('/') && (
                  <div className="flex items-center space-x-1">
                    {onInspectSubnet && (
                      <button
                        onClick={() => {
                          const [ipStr, cidrStr] = item.cidr.split('/');
                          const c = Number(cidrStr);
                          if (ipStr && !isNaN(c)) onInspectSubnet(ipStr, c);
                        }}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                        title="Inspect in Subnet Calculator"
                      >
                        Inspect
                      </button>
                    )}
                    {onSelectForConfig && (
                      <button
                        onClick={() => {
                          const [ipStr, cidrStr] = item.cidr.split('/');
                          const c = Number(cidrStr);
                          if (ipStr && !isNaN(c)) onSelectForConfig(ipStr, c);
                        }}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                        title="Generate Device Config"
                      >
                        Config
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Status Display */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        {result.invalidCount && result.invalidCount > 0 ? (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center space-x-2 text-xs text-amber-700 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              {result.invalidCount} network entry {result.invalidCount === 1 ? 'is' : 'are'} incomplete or invalid (expected format: <code>10.0.0.0/24</code>).
            </span>
          </div>
        ) : null}

        {result.notice ? (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center space-x-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Ready to Analyze
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {result.notice}
              </p>
            </div>
          </div>
        ) : result.hasOverlap ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start space-x-3">
              <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-red-800 dark:text-red-200">
                  Address Collision Detected! ({result.conflicts.length} conflict{result.conflicts.length > 1 ? 's' : ''})
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  The following subnets intersect and will cause routing conflicts or dropped packets if routed across the same topology.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.conflicts.map((c, i) => (
                <div key={i} className="py-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Conflict #{i + 1}: <span className="text-red-600 dark:text-red-400 font-mono">{c.subnet1}</span> &nbsp; collides with &nbsp; <span className="text-red-600 dark:text-red-400 font-mono">{c.subnet2}</span>
                  </div>
                  <div className="font-mono text-slate-600 dark:text-slate-400">
                    Overlapping IP Range: <strong className="text-red-700 dark:text-red-300">{c.overlapRange}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">
                  All Subnets Disjoint & Conflict-Free
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  No overlapping address spaces detected between any of the {result.validSubnets.length} defined subnets. Safe to peer or route.
                </p>
              </div>
            </div>

            {onSummarizeRoutes && result.validSubnets.length >= 2 && (
              <button
                onClick={() => onSummarizeRoutes(result.validSubnets.map(s => s.cidr))}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                title="Send verified disjoint subnets to Route Aggregator"
              >
                <GitMerge className="h-3.5 w-3.5" />
                <span>Summarize in Aggregator</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
