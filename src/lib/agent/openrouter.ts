// Compatibilidad con modulos existentes. El proveedor se resuelve en provider.ts.
export {
  getAgentClient as getOpenRouterClient,
  hasAgentKey as hasOpenRouterKey,
  getAgentModel,
} from "./provider";
