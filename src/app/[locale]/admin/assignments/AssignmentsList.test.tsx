// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentsList from './AssignmentsList';

// ── Mock setup ─────────────────────────────────────────
const mockRR = vi.fn();
const mockTS = vi.fn();
const mockTE = vi.fn();
const mockCA = vi.fn();
const mockUA = vi.fn();
const mockGEC = vi.fn();
const labels: Record<string, string> = {
  assignmentsTitle: 'Asignaciones', noAssignments: 'No hay asignaciones',
  newAssignment: 'Nueva Asignación', createAssignment: 'Crear Asignación',
  btnCancel: 'Cancelar', btnCreate: 'Crear',
  formExamConfig: 'Configuración de Examen', formSelectExamConfig: 'Seleccionar configuración...',
  loadingConfigs: 'Cargando...', formAssignedToType: 'Tipo de Destinatario',
  formAssignedToTypeSpace: 'Espacio', formAssignedToTypeGroup: 'Grupo',
  formAssignedToTypeUser: 'Usuario', formAssignedToId: 'ID del Destinatario',
  formStartDate: 'Fecha de Inicio', formEndDate: 'Fecha de Fin',
  formMaxAttempts: 'Máximo de Intentos', optional: 'opcional',
  validationRequired: 'Campo requerido', validationInvalidDates: 'La fecha de fin debe ser posterior a la de inicio',
  assignmentCreated: 'Asignación creada', assignmentCreateError: 'Error al crear la asignación',
  unnamedConfig: 'Sin nombre', assignmentMaxAttempts: 'Intentos máximos',
  assignmentType: 'Tipo', assignmentActive: 'Activa',
  publishAssignment: 'Publicar', archiveAssignment: 'Archivar', deleteAssignment: 'Eliminar',
  publishConfirmTitle: '¿Publicar?', publishConfirmMessage: 'Estará disponible.',
  archiveConfirmTitle: '¿Archivar?', archiveConfirmMessage: 'Dejará de estar disponible.',
  deleteConfirmTitle: '¿Eliminar?', deleteConfirmMessage: 'Se ocultará la asignación.',
  statusDraft: 'Borrador', statusPublished: 'Publicado', statusArchived: 'Archivado',
  cancel: 'Cancelar', editAssignment: 'Editar', editAssignmentTitle: 'EDITAR ASIGNACIÓN',
  btnSave: 'GUARDAR CAMBIOS', assignmentUpdated: 'Asignación actualizada',
  assignmentUpdateError: 'Error al actualizar', assignmentPublished: 'Publicada',
  assignmentArchived: 'Archivada', assignmentDeleted: 'Eliminada',
  assignmentPublishError: 'Error publicar', assignmentArchiveError: 'Error archivar',
  assignmentDeleteError: 'Error eliminar', auditLog: 'Historial', auditLogEmpty: 'Sin eventos',
  auditLogAction_CREATE: 'Creada', auditLogAction_PUBLISHED: 'Publicada',
  auditLogAction_ARCHIVED: 'Archivada', auditLogAction_DELETED: 'Eliminada',
  auditLogAction_UPDATE: 'Actualizada', publishedFieldLocked: 'Campo bloqueado...',
  assignmentFilterAll: 'Todas', assignmentFilteredCount: '{filtered} de {total}',
  brandPart1: 'ABD', brandPart2: 'Suite',
};
const mockT = vi.fn((k: string) => labels[k] || k);

vi.mock('@ajabadia/styles', () => ({
  LabeledField: ({ id, label, error, required, hint, children, className, labelClassName }: Record<string,unknown>) =>
    <div className={(className as string) || ''} data-testid={`lf-${id as string}`}>
      <label htmlFor={id as string} className={(labelClassName as string) || ''}>
        {label as React.ReactNode}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {children as React.ReactNode}
      {hint ? <p className="text-xs">{hint as React.ReactNode}</p> : null}
      {error ? <p role="alert" className="text-xs">{error as string}</p> : null}
    </div>,
}));

vi.mock('@ajabadia/ecosystem-widgets', () => {
  const C = ({open,onCancel,onConfirm,title,message}: Record<string,unknown>) =>
    open ? <div data-testid="cd"><p>{title as string}</p><p>{message as string}</p>
      <button aria-label="dialog-cancel" onClick={onCancel as ()=>void} />
      <button aria-label="dialog-confirm" onClick={onConfirm as ()=>void} /></div> : null;
  C.displayName = 'ConfirmDialog';

  // Dialog sub-components re-exported from ecosystem-widgets via @/components/ui/dialog
  const DL = ({children,...props}: Record<string,unknown>) => <div data-slot="dialog-header" {...props}>{children as React.ReactNode}</div>;
  const DF = ({children,...props}: Record<string,unknown>) => <div data-slot="dialog-footer" {...props}>{children as React.ReactNode}</div>;
  const DT = ({children,...props}: Record<string,unknown>) => <h2 data-slot="dialog-title" {...props}>{children as React.ReactNode}</h2>;
  const DD = ({children,...props}: Record<string,unknown>) => <p data-slot="dialog-description" {...props}>{children as React.ReactNode}</p>;

  return {
    ConfirmDialog: C,
    SmartNavbar:()=>null, GlobalFooter:()=>null, buildSidebarLinks:()=>[],
    DialogHeader: DL, DialogFooter: DF, DialogTitle: DT, DialogDescription: DD,
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRR }), useSearchParams: () => new URLSearchParams() }));
vi.mock('next-intl', () => ({ useTranslations: () => mockT }));
vi.mock('sonner', () => ({ toast: { success: (...a:unknown[])=>mockTS(...a), error: (...a:unknown[])=>mockTE(...a) } }));
vi.mock('@/actions/examAssignment', () => ({
  createAssignmentAction: (...a:unknown[])=>mockCA(...a), updateAssignmentAction: (...a:unknown[])=>mockUA(...a),
  publishAssignmentAction: vi.fn().mockResolvedValue({success:true}),
  archiveAssignmentAction: vi.fn().mockResolvedValue({success:true}),
  deleteAssignmentAction: vi.fn().mockResolvedValue({success:true}),
}));
vi.mock('@/actions/examConfig', () => ({ getExamConfigsAction: (...a:unknown[])=>mockGEC(...a) }));

const mockAssignments = [
  { _id:'a1', tenantId:'t1', examConfigId:'cfg1', examConfigName:'Examen A', assignedToType:'space' as const,
    assignedToId:'space-abc', startDate:'2025-06-01T00:00:00.000Z', endDate:'2025-07-01T00:00:00.000Z',
    status:'draft' as const, maxAttempts:2, active:true, createdBy:'u1',
    auditTrail:[{action:'QUIZ_ASSIGNMENT_CREATE',userId:'u1',userEmail:'a@t.com',timestamp:'2025-05-01T00:00:00.000Z',details:'Creada'}],
    createdAt:'2025-05-01T00:00:00.000Z', updatedAt:'2025-05-01T00:00:00.000Z' },
  { _id:'a2', tenantId:'t1', examConfigId:'cfg2', examConfigName:'Examen B', assignedToType:'user' as const,
    assignedToId:'user-xyz', startDate:'2025-05-01T00:00:00.000Z', endDate:'2025-08-01T00:00:00.000Z',
    status:'published' as const, maxAttempts:0, active:true, createdBy:'u1',
    auditTrail:[{action:'QUIZ_ASSIGNMENT_CREATE',userId:'u1',userEmail:'a@t.com',timestamp:'2025-04-01T00:00:00.000Z',details:'Creada'},
      {action:'QUIZ_ASSIGNMENT_PUBLISHED',userId:'u1',userEmail:'a@t.com',timestamp:'2025-04-02T00:00:00.000Z',details:'Publicada'}],
    createdAt:'2025-04-01T00:00:00.000Z', updatedAt:'2025-04-01T00:00:00.000Z' },
];

async function fillForm(d:{examConfigId?:string;assignedToId?:string;startDate?:string;endDate?:string}={}) {
  const u = userEvent.setup();
  await u.selectOptions(screen.getByDisplayValue('Seleccionar configuración...'), d.examConfigId || 'cfg1');
  await u.type(screen.getByPlaceholderText('ID...'), d.assignedToId || 'space-42');
  const di = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
  if (di.length>=2) { fireEvent.change(di[0],{target:{value:d.startDate||'2025-06-01T00:00'}}); fireEvent.change(di[1],{target:{value:d.endDate||'2025-07-01T00:00'}}); }
}

describe('AssignmentsList — Create Modal', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGEC.mockResolvedValue([{_id:'cfg1',name:'Examen A'},{_id:'cfg2',name:'Examen B'}]); });

  it('renders list and opens create modal', async () => {
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    expect(screen.getByRole('heading',{name:'Examen A'})).toBeDefined();
    await u.click(screen.getByText('Nueva Asignación'));
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
  });

  it('opens modal automatically with showCreateForm', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    expect(mockGEC).toHaveBeenCalledTimes(1);
  });

  it('validates empty form', async () => {
    const u = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    await u.click(screen.getByText('Crear'));
    await waitFor(()=>{ const e = screen.getAllByText('Campo requerido'); expect(e.length).toBeGreaterThanOrEqual(4); });
    expect(mockCA).not.toHaveBeenCalled();
  });

  it('validates date ordering', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    await fillForm({startDate:'2025-07-01T00:00',endDate:'2025-06-01T00:00'});
    await userEvent.setup().click(screen.getByText('Crear'));
    await waitFor(()=>expect(screen.getByText('La fecha de fin debe ser posterior a la de inicio')).toBeDefined());
    expect(mockCA).not.toHaveBeenCalled();
  });

  it('creates assignment on valid submit', async () => {
    mockCA.mockResolvedValue({success:true,id:'n1'});
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    await fillForm();
    await userEvent.setup().click(screen.getByText('Crear'));
    await waitFor(()=>expect(mockCA).toHaveBeenCalledWith(expect.objectContaining({examConfigId:'cfg1'})));
    expect(mockTS).toHaveBeenCalledWith('Asignación creada');
    expect(mockRR).toHaveBeenCalled();
  });

  it('shows error toast on create failure', async () => {
    mockCA.mockResolvedValue({success:false,error:'Error'});
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    await fillForm(); await userEvent.setup().click(screen.getByText('Crear'));
    await waitFor(()=>expect(mockTE).toHaveBeenCalledWith('Error'));
  });

  it('shows generic error toast on create throw', async () => {
    mockCA.mockRejectedValue(new Error('Net'));
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);
    await waitFor(()=>expect(screen.getByText('Crear Asignación')).toBeDefined());
    await fillForm(); await userEvent.setup().click(screen.getByText('Crear'));
    await waitFor(()=>expect(mockTE).toHaveBeenCalledWith('Error al crear la asignación'));
  });

  it('renders empty state', () => {
    render(<AssignmentsList assignments={[]} locale="es" />);
    expect(screen.getByText('No hay asignaciones')).toBeDefined();
  });
});

describe('AssignmentsList — Edit Modal', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGEC.mockResolvedValue([{_id:'cfg1',name:'Examen A'},{_id:'cfg2',name:'Examen B'}]); });

  it('opens edit modal with pre-filled data', async () => {
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await u.click(screen.getAllByTitle('Editar')[0]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    expect(screen.getByDisplayValue('space-abc')).toBeDefined();
    expect(screen.getByDisplayValue('2')).toBeDefined();
  });

  it('calls updateAssignmentAction on save', async () => {
    mockUA.mockResolvedValue({success:true});
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await u.click(screen.getAllByTitle('Editar')[0]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    await u.click(screen.getByText('GUARDAR CAMBIOS'));
    await waitFor(()=>expect(mockUA).toHaveBeenCalledTimes(1));
    expect(mockUA).toHaveBeenCalledWith('a1',expect.objectContaining({examConfigId:'cfg1',assignedToId:'space-abc',maxAttempts:2}));
    expect(mockTS).toHaveBeenCalled();
    expect(mockRR).toHaveBeenCalled();
  });

  it('shows error toast on update failure', async () => {
    mockUA.mockResolvedValue({success:false,error:'Error mod'});
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await u.click(screen.getAllByTitle('Editar')[0]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    await u.click(screen.getByText('GUARDAR CAMBIOS'));
    await waitFor(()=>expect(mockTE).toHaveBeenCalledWith('Error mod'));
  });

  it('shows generic error toast on update throw', async () => {
    mockUA.mockRejectedValue(new Error('Srv'));
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await u.click(screen.getAllByTitle('Editar')[0]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    await u.click(screen.getByText('GUARDAR CAMBIOS'));
    await waitFor(()=>expect(mockTE).toHaveBeenCalledWith('Error al actualizar'));
  });

  it('validates dates on update', async () => {
    mockUA.mockResolvedValue({success:true});
    const u = userEvent.setup(); render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await u.click(screen.getAllByTitle('Editar')[0]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    const di = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
    fireEvent.change(di[1],{target:{value:'2025-05-01T00:00'}});
    await u.click(screen.getByText('GUARDAR CAMBIOS'));
    await waitFor(()=>expect(screen.getByText('La fecha de fin debe ser posterior a la de inicio')).toBeDefined());
    expect(mockUA).not.toHaveBeenCalled();
  });

  it('respects published field lock', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);
    await userEvent.setup().click(screen.getAllByTitle('Editar')[1]);
    await waitFor(()=>expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined());
    expect(screen.getByDisplayValue('user-xyz')).toHaveProperty('disabled',true);
    expect(screen.getByDisplayValue('0')).toHaveProperty('disabled',false);
  });
});
