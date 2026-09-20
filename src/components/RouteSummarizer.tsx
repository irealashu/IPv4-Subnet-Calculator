import React, { useState, useMemo, useEffect } from 'react';
import { summarizeRoutes, cidrToMask } from '../utils/ipv4';
import { GitMerge, Copy, Check, Info, ArrowRight, ShieldCheck, Terminal, Calculator, ShieldAlert } from 'lucide-react';

const SAMPLE_ROUTES = `192.168.0.0/24
192.168.1.0/24
192.168.2.0/24
192.168.3.0/24`;

interface RouteSummarizerProps {
  initialRoutes?: string[];
  onInspectSubnet?: (ip: string, cidr: number) => void;
  onSelectForConfig?: (ip: string, cidr: number) => void;
  onCheckOverlap?: (cidr: string) => void;
}

export const RouteSummarizer: React.FC<RouteSummarizerProps> = ({
  initialRoutes,
  onInspectSubnet,
  onSelectForConfig,
  onCheckOverlap
}) => {
  const [inputText, setInputText] = useState<string>(() =>
    initialRoutes && initialRoutes.length > 0 ? initialRoutes.join('\n') : SAMPLE_ROUTES
  );
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoutes && initialRoutes.length > 0) {
      setInputText(initialRoutes.join('\n'));
    }
  }, [initialRoutes]);

  const routeList = useMemo(() => {
    return inputText
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean);
  }, [inputText]);

  const summary = useMemo(() => {
    return summarizeRoutes(routeList);
  }, [routeList]);

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
          <GitMerge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Route Summarization & Supernetting
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Aggregate multiple discrete subnets into the most specific covering supernet to optimize routing tables for BGP, OSPF, and static routing.
        </p>

        {/* Text Area Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Input Subnets / CIDR Blocks (One per line)
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setInputText(`10.1.0.0/24\n10.1.1.0/24\n10.1.2.0/24\n10.1.3.0/24\n10.1.4.0/24\n10.1.5.0/24\n10.1.6.0/24\n10.1.7.0/24`)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Load /21 Sample
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => setInputText(`172.16.0.0/20\n172.16.16.0/20\n172.16.32.0/20\n172.16.48.0/20`)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Load Cloud Sample
              </button>
            </div>
          </div>

          <textarea
            id="route-summarizer-input"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="192.168.0.0/24&#10;192.168.1.0/24&#10;192.168.2.0/24&#10;192.168.3.0/24"
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {summary.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
            <Info className="h-4 w-4 shrink-0 text-red-500" />
            <span>{summary.error}</span>
          </div>
        )}
      </div>

      {/* Results Card */}
      {summary.isValid && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Summarized Supernet Result
          </h3>

          {/* Key Aggregate Highlight */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                Optimized Supernet Prefix
              </span>
              <div className="text-3xl font-mono font-black text-blue-800 dark:text-blue-200">
                {summary.summarizedCidr}
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-300 font-mono mt-1 block">
                Total aggregate scope: {summary.totalCoveredHosts.toLocaleString()} IP addresses
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onInspectSubnet && (
                <button
                  onClick={() => {
                    const [ipStr, cidrStr] = summary.summarizedCidr.split('/');
                    const c = Number(cidrStr);
                    if (ipStr && !isNaN(c)) onInspectSubnet(ipStr, c);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Inspect this supernet in Subnet Calculator"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Inspect in Calculator</span>
                </button>
              )}
              {onSelectForConfig && (
                <button
                  onClick={() => {
                    const [ipStr, cidrStr] = summary.summarizedCidr.split('/');
                    const c = Number(cidrStr);
                    if (ipStr && !isNaN(c)) onSelectForConfig(ipStr, c);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Generate router/firewall device configs for supernet"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Device Config</span>
                </button>
              )}
              {onCheckOverlap && (
                <button
                  onClick={() => onCheckOverlap(summary.summarizedCidr)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 transition-colors"
                  title="Check supernet for conflicts in Overlap Detector"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Check Conflicts</span>
                </button>
              )}
              <button
                onClick={() => copyToClipboard(summary.summarizedCidr, 'cidr')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                {copied === 'cidr' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied === 'cidr' ? 'Copied!' : 'Copy Supernet'}</span>
              </button>
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Input Routes
              </span>
              <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
                {summary.originalRoutesCount}
              </div>
              <span className="text-xs text-slate-400">Individual routing table entries</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Routing Table Reduction
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {summary.reductionPercentage}%
              </div>
              <span className="text-xs text-slate-400">Reduced to 1 single route</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Router Command Syntax
              </span>
              {(() => {
                const parts = summary.summarizedCidr.split('/');
                const supernetIp = parts[0];
                const supernetPrefix = Number(parts[1]);
                const supernetMask = cidrToMask(supernetPrefix);
                const bgpCmd = `aggregate-address ${supernetIp} ${supernetMask} summary-only`;
                const staticCmd = `ip route ${supernetIp} ${supernetMask} Null0`;
                return (
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate" title={bgpCmd}>
                      {bgpCmd}
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        onClick={() => copyToClipboard(bgpCmd, 'bgp')}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {copied === 'bgp' ? 'Copied BGP!' : 'Copy BGP'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        onClick={() => copyToClipboard(staticCmd, 'static')}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {copied === 'static' ? 'Copied Static!' : 'Copy Static Null0'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
