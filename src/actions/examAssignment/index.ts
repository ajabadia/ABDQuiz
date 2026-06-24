/**
 * @purpose Gestiona datos de asignaciones de examen proporcionando acciones para listar, obtener, crear, actualizar, publicar, archivar y eliminar asignaciones.
 * @purpose_en Manages exam assignment data by providing actions for listing, fetching, creating, updating, publishing, archiving, and deleting assignments.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1vbr1ff
 * @lastUpdated 2026-06-23T16:27:28.823Z
 */

// Types
export type {
  SerializedExamAssignment,
  SerializedAuditEntry,
  ListAssignmentsFilters,
  CreateAssignmentData,
  UpdateAssignmentData,
} from './types';

// List & Fetch
export { listAssignmentsAction, getAvailableExamsAction } from './list';

// CRUD
export { createAssignmentAction, updateAssignmentAction, publishAssignmentAction, archiveAssignmentAction, deleteAssignmentAction } from './crud';
