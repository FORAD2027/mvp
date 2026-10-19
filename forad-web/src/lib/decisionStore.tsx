import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultPredictions, validatePredictions, type DecisionDraft, type Issue, type PredictionKey, type Predictions } from '../data/decision';
import {
  changedOperations, defaultOperations, deriveOperations, validateOperations,
  type Derived, type OperationsDraft, type OpsEntity, type OpsIssue,
} from '../data/operations';
import { lastPosition, type TeamPosition } from '../data/teamPosition';
import {
  changedInvesting, defaultInvesting, deriveInvesting, lastInvesting, validateInvesting,
  type InvEntity, type InvIssue, type InvestingDerived, type InvestingDraft, type InvestingPosition,
} from '../data/investing';
import {
  changedFinancing, defaultFinancing, finContext, lastFinancing, validateFinancing,
  type FinContext, type FinEntity, type FinIssue, type FinancingDraft,
} from '../data/financing';
import { changedHedging, defaultHedging, validateHedging, type HedgeInput, type HedgeIssue, type HedgingDraft } from '../data/hedging';
import type { Ccy } from '../data/bimr';
import { useAuth } from './auth';

/**
 * Team decision draft for the current period: forecasts (S-05) and operations (S-06).
 * Saved on this device for now; server autosave shared by the team is S-14.
 */
interface DecisionValue {
  draft: DecisionDraft;
  defaults: Predictions;
  issues: Issue[];
  changedKeys: PredictionKey[];
  setPrediction: (key: PredictionKey, value: number) => void;
  resetPrediction: (key: PredictionKey) => void;
  resetAllPredictions: () => void;
  // operations
  lastPos: TeamPosition;
  opsDefaults: OperationsDraft;
  derived: Derived;
  opsIssues: OpsIssue[];
  opsChanged: string[];
  setOps: <E extends OpsEntity>(entity: E, key: keyof OperationsDraft[E], value: OperationsDraft[E][keyof OperationsDraft[E]]) => void;
  resetOpsEntity: (entity: OpsEntity) => void;
  // investing
  invLast: InvestingPosition;
  invDefaults: InvestingDraft;
  invDerived: InvestingDerived;
  invIssues: InvIssue[];
  invChanged: string[];
  setInv: <E extends InvEntity>(entity: E, key: keyof InvestingDraft[E], value: number) => void;
  resetInvEntity: (entity: InvEntity) => void;
  // financing
  finCtx: FinContext;
  finLast: FinancingDraft;
  finDefaults: FinancingDraft;
  finIssues: FinIssue[];
  finChanged: string[];
  setFin: <E extends FinEntity>(entity: E, key: keyof FinancingDraft[E], value: number) => void;
  resetFinEntity: (entity: FinEntity) => void;
  // hedging
  hedgeDefaults: HedgingDraft;
  hedgeIssues: HedgeIssue[];
  hedgeChanged: string[];
  setHedge: (key: string, field: keyof HedgeInput, value: number) => void;
  setIr: (ccy: Ccy, value: number) => void;
  resetHedge: (key: string | 'IR') => void;
}

const DecisionContext = createContext<DecisionValue | null>(null);
const storageKey = (team: number, period: number) => `forad.draft.T${team}.P${period}`;

function load(team: number, period: number, defaults: Predictions, ops: OperationsDraft, inv: InvestingDraft, fin: FinancingDraft, hedge: HedgingDraft): DecisionDraft {
  const fresh: DecisionDraft = { team, period, predictions: { ...defaults }, operations: structuredClone(ops), investing: structuredClone(inv), financing: structuredClone(fin), hedging: structuredClone(hedge), updatedAt: null };
  try {
    const raw = window.localStorage.getItem(storageKey(team, period));
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<DecisionDraft>;
    if (saved.team !== team || saved.period !== period) return fresh;
    return {
      ...fresh,
      updatedAt: saved.updatedAt ?? null,
      predictions: { ...defaults, ...saved.predictions },
      operations: {
        japan: { ...ops.japan, ...saved.operations?.japan },
        germany: { ...ops.germany, ...saved.operations?.germany },
      },
      investing: {
        japan: { ...inv.japan, ...saved.investing?.japan },
        germany: { ...inv.germany, ...saved.investing?.germany },
        us: { ...inv.us, ...saved.investing?.us },
      },
      financing: {
        japan: { ...fin.japan, ...saved.financing?.japan },
        germany: { ...fin.germany, ...saved.financing?.germany },
        us: { ...fin.us, ...saved.financing?.us },
      },
      hedging: {
        fx: Object.fromEntries(Object.keys(hedge.fx).map((k) => [k, { ...hedge.fx[k], ...saved.hedging?.fx?.[k] }])),
        ir: { ...hedge.ir, ...saved.hedging?.ir },
      },
    };
  } catch {
    return fresh;
  }
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const team = session.teamNumber;
  const period = session.currentPeriod;
  const defaults = useMemo(() => defaultPredictions(period), [period]);
  const opsDefaults = useMemo(() => defaultOperations(period), [period]);
  const lastPos = useMemo(() => lastPosition(period - 1), [period]);
  const invDefaults = useMemo(() => defaultInvesting(period), [period]);
  const invLast = useMemo(() => lastInvesting(period - 1), [period]);
  const finDefaults = useMemo(() => defaultFinancing(period), [period]);
  const finLast = useMemo(() => lastFinancing(period - 1), [period]);
  const finCtx = useMemo(() => finContext(period), [period]);
  const hedgeDefaults = useMemo(() => defaultHedging(period, defaults.jpyPerUsd, defaults.usdPerEur), [period, defaults]);
  const [draft, setDraft] = useState<DecisionDraft>(() => load(team, period, defaults, opsDefaults, invDefaults, finDefaults, hedgeDefaults));

  useEffect(() => {
    if (!draft.updatedAt) return;
    try {
      window.localStorage.setItem(storageKey(team, period), JSON.stringify(draft));
    } catch {
      /* storage unavailable: the draft lives until reload */
    }
  }, [draft, team, period]);

  const touch = useCallback(
    (fn: (d: DecisionDraft) => Partial<DecisionDraft>) =>
      setDraft((d) => ({ ...d, ...fn(d), team, period, updatedAt: new Date().toISOString() })),
    [team, period],
  );

  const setPrediction = useCallback((key: PredictionKey, value: number) => touch((d) => ({ predictions: { ...d.predictions, [key]: value } })), [touch]);
  const resetPrediction = useCallback((key: PredictionKey) => touch((d) => ({ predictions: { ...d.predictions, [key]: defaults[key] } })), [touch, defaults]);
  const resetAllPredictions = useCallback(() => touch(() => ({ predictions: { ...defaults } })), [touch, defaults]);

  const setOps = useCallback<DecisionValue['setOps']>(
    (entity, key, value) => touch((d) => ({ operations: { ...d.operations, [entity]: { ...d.operations[entity], [key]: value } } })),
    [touch],
  );
  const resetOpsEntity = useCallback(
    (entity: OpsEntity) => touch((d) => ({ operations: { ...d.operations, [entity]: { ...opsDefaults[entity] } } })),
    [touch, opsDefaults],
  );

  const setInv = useCallback<DecisionValue['setInv']>(
    (entity, key, value) => touch((d) => ({ investing: { ...d.investing, [entity]: { ...d.investing[entity], [key]: value } } })),
    [touch],
  );
  const resetInvEntity = useCallback(
    (entity: InvEntity) => touch((d) => ({ investing: { ...d.investing, [entity]: { ...invDefaults[entity] } } })),
    [touch, invDefaults],
  );
  const invDerived = useMemo(() => deriveInvesting(draft.investing, invLast), [draft.investing, invLast]);
  const invIssues = useMemo(() => validateInvesting(draft.investing, invDerived, invLast, period), [draft.investing, invDerived, invLast, period]);
  const invChanged = useMemo(() => changedInvesting(draft.investing, invDefaults), [draft.investing, invDefaults]);

  const setFin = useCallback<DecisionValue['setFin']>(
    (entity, key, value) => touch((d) => ({ financing: { ...d.financing, [entity]: { ...d.financing[entity], [key]: value } } })),
    [touch],
  );
  const resetFinEntity = useCallback(
    (entity: FinEntity) => touch((d) => ({ financing: { ...d.financing, [entity]: { ...finDefaults[entity] } } })),
    [touch, finDefaults],
  );
  const finIssues = useMemo(() => validateFinancing(draft.financing, finCtx), [draft.financing, finCtx]);
  const finChanged = useMemo(() => changedFinancing(draft.financing, finDefaults), [draft.financing, finDefaults]);

  const setHedge = useCallback<DecisionValue['setHedge']>(
    (key, field, value) => touch((d) => ({ hedging: { ...d.hedging, fx: { ...d.hedging.fx, [key]: { ...d.hedging.fx[key], [field]: value } } } })),
    [touch],
  );
  const setIr = useCallback((ccy: Ccy, value: number) => touch((d) => ({ hedging: { ...d.hedging, ir: { ...d.hedging.ir, [ccy]: value } } })), [touch]);
  const resetHedge = useCallback(
    (key: string) => touch((d) => (key === 'IR'
      ? { hedging: { ...d.hedging, ir: { ...hedgeDefaults.ir } } }
      : { hedging: { ...d.hedging, fx: { ...d.hedging.fx, [key]: { ...hedgeDefaults.fx[key] } } } })),
    [touch, hedgeDefaults],
  );
  const hedgeIssues = useMemo(() => validateHedging(draft.hedging, period, finCtx, draft.predictions.jpyPerUsd, draft.predictions.usdPerEur), [draft.hedging, period, finCtx, draft.predictions]);
  const hedgeChanged = useMemo(() => changedHedging(draft.hedging, hedgeDefaults), [draft.hedging, hedgeDefaults]);

  const issues = useMemo(() => validatePredictions(draft.predictions), [draft.predictions]);
  const changedKeys = useMemo(
    () => (Object.keys(defaults) as PredictionKey[]).filter((k) => Math.abs(draft.predictions[k] - defaults[k]) > 1e-12),
    [draft.predictions, defaults],
  );
  const derived = useMemo(() => deriveOperations(draft.operations, draft.predictions, lastPos), [draft.operations, draft.predictions, lastPos]);
  const opsIssues = useMemo(() => validateOperations(draft.operations, derived, lastPos), [draft.operations, derived, lastPos]);
  const opsChanged = useMemo(() => changedOperations(draft.operations, opsDefaults), [draft.operations, opsDefaults]);

  return (
    <DecisionContext.Provider
      value={{
        draft, defaults, issues, changedKeys, setPrediction, resetPrediction, resetAllPredictions,
        lastPos, opsDefaults, derived, opsIssues, opsChanged, setOps, resetOpsEntity,
        invLast, invDefaults, invDerived, invIssues, invChanged, setInv, resetInvEntity,
        finCtx, finLast, finDefaults, finIssues, finChanged, setFin, resetFinEntity,
        hedgeDefaults, hedgeIssues, hedgeChanged, setHedge, setIr, resetHedge,
      }}
    >
      {children}
    </DecisionContext.Provider>
  );
}

export function useDecision(): DecisionValue {
  const ctx = useContext(DecisionContext);
  if (!ctx) throw new Error('useDecision must be used inside DecisionProvider');
  return ctx;
}
