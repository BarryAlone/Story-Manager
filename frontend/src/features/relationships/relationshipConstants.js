export const MAX_LEGEND_ITEMS = 8;
export const SCENARIO_PARAM = import.meta.env.DEV ? 'graphScenario' : '';
export const UNGROUPED_FILTER = '__without_group__';

export const DEV_SCENARIOS = import.meta.env.DEV ? [
  { key: '100-sparse', label: '100 postaci — graf rzadki' },
  { key: '100-dense', label: '100 postaci — graf gęstszy' },
  { key: '200-sparse', label: '200 postaci — graf rzadki' },
  { key: '200-dense', label: '200 postaci — graf gęstszy' },
] : [];

export const DEV_SCENARIO_KEYS = new Set(DEV_SCENARIOS.map((scenario) => scenario.key));

export const RELATION_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#0891b2',
  '#be185d',
  '#4f46e5',
];

export const GRAPH_CAMERA = {
  nodeZoom: 2.4,
  linkZoom: 2,
  animationMs: 400,
  fitAnimationMs: 450,
  fitPadding: 56,
  fitPreviewDelayMs: 350,
  fitFallbackDelayMs: 2800,
};

export const GRAPH_RENDERING = {
  minimumWidth: 280,
  minimumHeight: 420,
  nodeRadius: 9,
  nodeHitRadius: 14,
  linkHitWidth: 10,
  cooldownTicks: 160,
};
