import React, { useState, useMemo } from 'react';
import { getCidrMatrixData } from '../utils/ipv4';
import { TableProperties, Search, ArrowUpRight, Copy, Check } from 'lucide-react';

interface CidrMatrixProps {
  onSelectCidr: (cidr: number) => void;
  onPlanVlsm?: (cidr: number) => void;
}

export const CidrMatrix: React.FC<CidrMatrixProps> = ({ onSelectCidr, onPlanVlsm }) => {
  const [search, setSearch] = useState<string>('');
  const [copiedCidr, setCopiedCidr] = useState<number | null>(null);

  const data = useMemo(() => getCidrMatrixData(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter(item =>
      `/${item.cidr}`.includes(q) ||
      String(item.cidr) === q ||
      item.subnetMask.includes(q) ||
      item.wildcardMask.includes(q) ||
      item.classType.toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q)
    );
  }, [data, search]);

  const copyMask = (mask: string, cidr: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mask);
    }
    setCopiedCidr(cidr);
    setTimeout(() => setCopiedCidr(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <TableProperties className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                IPv4 CIDR Reference Matrix & Cheat Sheet
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive lookup matrix covering prefix lengths /0 through /32 with usable capacities and standard enterprise applications.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by prefix, mask, hosts..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">CIDR</th>
                <th className="py-3 px-4">Subnet Mask</th>
                <th className="py-3 px-4">Wildcard Mask</th>
                <th className="py-3 px-4">Total Hosts</th>
                <th className="py-3 px-4">Usable Hosts</th>
                <th className="py-3 px-4">Class / Scope</th>
                <th className="py-3 px-4">Common Use Case</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filtered.map(row => (
                <tr
                  key={row.cidr}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    row.cidr === 24 || row.cidr === 16 || row.cidr === 8
                      ? 'bg-blue-50/30 dark:bg-blue-950/20 font-semibold'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                    /{row.cidr}
                  </td>
                  <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                    <span className="cursor-pointer hover:underline" onClick={() => copyMask(row.subnetMask, row.cidr)}>
                      {row.subnetMask}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {row.wildcardMask}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {row.totalHosts.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {row.usableHosts.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">
                    {row.classType}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400">
                    {row.notes}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-1 justify-end">
                      <button
                        onClick={() => onSelectCidr(row.cidr)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/80 dark:hover:text-blue-300 font-sans text-[11px] font-medium transition-colors"
                        title="Open in Subnet Calculator"
                      >
                        <span>Calc</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                      {onPlanVlsm && row.cidr <= 30 && (
                        <button
                          onClick={() => onPlanVlsm(row.cidr)}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/80 dark:hover:text-indigo-300 font-sans text-[11px] font-medium transition-colors"
                          title="Plan subnets with this prefix in VLSM"
                        >
                          <span>VLSM</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
