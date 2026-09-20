import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { SubnetCalculator } from './components/SubnetCalculator';
import { VlsmPlanner } from './components/VlsmPlanner';
import { RouteSummarizer } from './components/RouteSummarizer';
import { OverlapChecker } from './components/OverlapChecker';
import { ConfigGenerator } from './components/ConfigGenerator';
import { CidrMatrix } from './components/CidrMatrix';
import { OverlapItem } from './types/network';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [calcIpOverride, setCalcIpOverride] = useState<string | null>(null);
  const [calcCidrOverride, setCalcCidrOverride] = useState<number | null>(null);
  const [vlsmMajorIp, setVlsmMajorIp] = useState<string | null>(null);
  const [vlsmMajorCidr, setVlsmMajorCidr] = useState<number | null>(null);
  const [summarizerRoutes, setSummarizerRoutes] = useState<string[] | null>(null);
  const [overlapItems, setOverlapItems] = useState<OverlapItem[] | null>(null);
  const [configIp, setConfigIp] = useState<string>('192.168.10.1');
  const [configCidr, setConfigCidr] = useState<number>(24);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_dark');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark class on document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_dark', 'false');
    }
  }, [darkMode]);

  const handleInspectSubnet = (ip: string, cidr: number) => {
    setCalcIpOverride(ip);
    setCalcCidrOverride(cidr);
    setActiveTab('calculator');
  };

  const handleSelectCidrFromMatrix = (cidr: number) => {
    localStorage.setItem('lastCIDR', String(cidr));
    setCalcCidrOverride(cidr);
    setActiveTab('calculator');
  };

  const handlePlanVlsm = (ip: string, cidr: number) => {
    setVlsmMajorIp(ip);
    setVlsmMajorCidr(cidr);
    setActiveTab('vlsm');
  };

  const handleSelectForConfig = (ip: string, cidr: number) => {
    setConfigIp(ip);
    setConfigCidr(cidr);
    setActiveTab('configs');
  };

  const handleCheckOverlap = (cidrOrItems: string | OverlapItem[]) => {
    if (typeof cidrOrItems === 'string') {
      setOverlapItems([
        { id: '1', cidr: cidrOrItems, name: 'Target Subnet' },
        { id: '2', cidr: '10.0.0.0/16', name: 'Corporate Core VPC' },
        { id: '3', cidr: '172.16.0.0/12', name: 'Datacenter Segment' },
        { id: '4', cidr: '192.168.0.0/16', name: 'Site-to-Site VPN' }
      ]);
    } else {
      setOverlapItems(cidrOrItems);
    }
    setActiveTab('overlap');
  };

  const handleAddToSummarizer = (cidrOrRoutes: string | string[]) => {
    if (typeof cidrOrRoutes === 'string') {
      setSummarizerRoutes([cidrOrRoutes]);
    } else {
      setSummarizerRoutes(cidrOrRoutes);
    }
    setActiveTab('summarizer');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* SaaS Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'calculator' && (
          <SubnetCalculator
            initialIpOverride={calcIpOverride || undefined}
            initialCidrOverride={calcCidrOverride || undefined}
            onSelectForConfig={(res) => {
              handleSelectForConfig(res.firstUsableHost || res.networkAddress, res.cidr);
            }}
            onPlanVlsm={(ip, cidr) => {
              handlePlanVlsm(ip, cidr);
            }}
            onCheckOverlap={(slashNotation) => {
              handleCheckOverlap(slashNotation);
            }}
            onAddToSummarizer={(slashNotation) => {
              handleAddToSummarizer(slashNotation);
            }}
          />
        )}

        {activeTab === 'vlsm' && (
          <VlsmPlanner
            initialMajorIp={vlsmMajorIp || undefined}
            initialMajorCidr={vlsmMajorCidr || undefined}
            onInspectSubnet={handleInspectSubnet}
            onSelectForConfig={handleSelectForConfig}
            onSummarizeRoutes={(routes) => {
              setSummarizerRoutes(routes);
              setActiveTab('summarizer');
            }}
            onCheckOverlap={(items) => {
              setOverlapItems(items);
              setActiveTab('overlap');
            }}
          />
        )}

        {activeTab === 'summarizer' && (
          <RouteSummarizer
            initialRoutes={summarizerRoutes || undefined}
            onInspectSubnet={handleInspectSubnet}
            onSelectForConfig={handleSelectForConfig}
            onCheckOverlap={(cidr) => {
              handleCheckOverlap(cidr);
            }}
          />
        )}

        {activeTab === 'overlap' && (
          <OverlapChecker
            initialItems={overlapItems || undefined}
            onSummarizeRoutes={(routes) => {
              setSummarizerRoutes(routes);
              setActiveTab('summarizer');
            }}
            onInspectSubnet={handleInspectSubnet}
            onSelectForConfig={handleSelectForConfig}
          />
        )}

        {activeTab === 'configs' && (
          <ConfigGenerator
            initialIp={configIp}
            initialCidr={configCidr}
            onInspectSubnet={handleInspectSubnet}
            onPlanVlsm={handlePlanVlsm}
          />
        )}

        {activeTab === 'matrix' && (
          <CidrMatrix
            onSelectCidr={handleSelectCidrFromMatrix}
            onPlanVlsm={(cidr) => {
              setVlsmMajorCidr(cidr);
              setActiveTab('vlsm');
            }}
          />
        )}
      </main>
    </div>
  );
};
