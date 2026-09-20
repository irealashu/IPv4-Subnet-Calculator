import React from 'react';
import { SubnetResult } from '../types/network';

interface BitVisualizerProps {
  subnet: SubnetResult;
}

export const BitVisualizer: React.FC<BitVisualizerProps> = ({ subnet }) => {
  const { binary, cidr } = subnet;
  const bitWeights = [128, 64, 32, 16, 8, 4, 2, 1];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            32-Bit Binary Representation
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            (Network: {cidr} bits | Host: {32 - cidr} bits)
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 dark:bg-blue-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">Network Bits</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">Host Bits</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 Octets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {binary.octets.map((octet, octetIdx) => {
          const octetDecimal = subnet.ip.split('.')[octetIdx];
          const maskDecimal = subnet.subnetMask.split('.')[octetIdx];

          return (
            <div
              key={octetIdx}
              className="bg-white dark:bg-slate-800/80 rounded-lg p-3 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
            >
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Octet {octetIdx + 1}
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {octetDecimal} <span className="text-slate-400 font-normal">/ netmask {maskDecimal}</span>
                </span>
              </div>

              {/* 8 Bits row */}
              <div className="grid grid-cols-8 gap-1">
                {octet.binaryString.split('').map((bitChar, bitIdx) => {
                  const globalBitIndex = octetIdx * 8 + bitIdx;
                  const isNetworkBit = globalBitIndex < cidr;

                  return (
                    <div
                      key={bitIdx}
                      className="flex flex-col items-center"
                      title={`Bit ${globalBitIndex + 1} (${bitWeights[bitIdx]}): ${isNetworkBit ? 'Network Bit' : 'Host Bit'}`}
                    >
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 mb-0.5 font-mono">
                        {bitWeights[bitIdx]}
                      </span>
                      <div
                        className={`w-full aspect-square flex items-center justify-center rounded text-xs font-mono font-bold transition-all ${
                          isNetworkBit
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {bitChar}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
