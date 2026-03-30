type GuideStep = {
  title: string;
  description: string;
  link?: { label: string; path: string };
};

export type QuickStartDef = {
  title: string;
  icon: React.ReactNode;
  steps: GuideStep[];
  defaultExpanded?: boolean;
};
