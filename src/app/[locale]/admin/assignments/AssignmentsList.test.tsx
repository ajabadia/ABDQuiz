// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentsList from './AssignmentsList';

// ── Mocks ──────────────────────────────────────────────

const mockRouterRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockT = vi.fn((key: string) => {
  const labels: Record<string, string> = {
    assignmentsTitle: 'Asignaciones de Exámenes',
    noAssignments: 'No hay asignaciones',
    newAssignment: 'Nueva Asignación',
    createAssignment: 'Crear Asignación',
    btnCancel: 'Cancelar',
    btnCreate: 'Crear',
    formExamConfig: 'Configuración de Examen',
    formSelectExamConfig: 'Seleccionar configuración...',
    loadingConfigs: 'Cargando...',
    formAssignedToType: 'Tipo de Destinatario',
    formAssignedToTypeSpace: 'Espacio',
    formAssignedToTypeGroup: 'Grupo',
    formAssignedToTypeUser: 'Usuario',
    formAssignedToId: 'ID del Destinatario',
    formStartDate: 'Fecha de Inicio',
    formEndDate: 'Fecha de Fin',
    formMaxAttempts: 'Máximo de Intentos',
    optional: 'opcional',
    validationRequired: 'Campo requerido',
    validationInvalidDates: 'La fecha de fin debe ser posterior a la de inicio',
    assignmentCreated: 'Asignación creada',
    assignmentCreateError: 'Error al crear la asignación',
    unnamedConfig: 'Sin nombre',
    assignmentMaxAttempts: 'Intentos máximos',
    assignmentType: 'Tipo',
    assignmentActive: 'Activa',
    publishAssignment: 'Publicar',
    archiveAssignment: 'Archivar',
    deleteAssignment: 'Eliminar',
    publishConfirmTitle: '¿Publicar asignación?',
    publishConfirmMessage: 'La asignación estará disponible para los destinatarios.',
    archiveConfirmTitle: '¿Archivar asignación?',
    archiveConfirmMessage: 'La asignación dejará de estar disponible.',
    deleteConfirmTitle: '¿Eliminar asignación?',
    deleteConfirmMessage: 'Esta acción ocultará la asignación.',
    statusDraft: 'Borrador',
    statusPublished: 'Publicado',
    statusArchived: 'Archivado',
    cancel: 'Cancelar',
    editAssignment: 'Editar',
    editAssignmentTitle: 'EDITAR ASIGNACIÓN',
    btnSave: 'GUARDAR CAMBIOS',
    assignmentUpdated: 'Asignación actualizada con éxito',
    assignmentUpdateError: 'Error al actualizar la asignación',
    auditLog: 'Historial de Cambios',
    auditLogEmpty: 'Sin eventos registrados',
    auditLogAction_CREATE: 'Asignación creada',
    auditLogAction_PUBLISHED: 'Publicada',
    auditLogAction_ARCHIVED: 'Archivada',
    auditLogAction_DELETED: 'Eliminada',
    auditLogAction_UPDATE: 'Actualizada',
    publishedFieldLocked: 'Campo bloqueado...',
    assignmentFilterAll: 'Todas las configuraciones',
    assignmentFilteredCount: '{filtered} de {total}',
    brandPart1: 'ABD',
    brandPart2: 'Suite',
  };
  return labels[key] || key;
});

vi.mock('@ajabadia/ecosystem-widgets', () => {
  const MockConfirmDialog = ({ open, onCancel, onConfirm, title, message, confirmLabel, cancelLabel }: Record<string, unknown>) =>
    open ? (
      <div data-testid="confirm-dialog">
        <p>{(title as string) || ''}</p>
        <p>{(message as string) || ''}</p>
        <button onClick={onCancel as () => void} aria-label={(cancelLabel as string) || 'Cancelar'}>{((cancelLabel as string) || '')}</button>
        <button onClick={onConfirm as () => void} aria-label={(confirmLabel as string) || 'Confirmar'}>{((confirmLabel as string) || '')}</button>
      </div>
    ) : null;
  MockConfirmDialog.displayName = 'ConfirmDialog';
  return {
    ConfirmDialog: MockConfirmDialog,
    SmartNavbar: () => null,
    GlobalFooter: () => null,
    buildSidebarLinks: () => [],
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => mockT,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockCreateAssignment = vi.fn();
const mockUpdateAssignment = vi.fn();
const mockGetExamConfigs = vi.fn();

vi.mock('@/actions/examAssignment', () => ({
  createAssignmentAction: (...args: unknown[]) => mockCreateAssignment(...args),
  updateAssignmentAction: (...args: unknown[]) => mockUpdateAssignment(...args),
  publishAssignmentAction: vi.fn().mockResolvedValue({ success: true }),
  archiveAssignmentAction: vi.fn().mockResolvedValue({ success: true }),
  deleteAssignmentAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/actions/examConfig', () => ({
  getExamConfigsAction: (...args: unknown[]) => mockGetExamConfigs(...args),
}));

// ── Sample data ────────────────────────────────────────

const mockAssignments = [
  {
    _id: 'a1',
    tenantId: 't1',
    examConfigId: 'cfg1',
    examConfigName: 'Examen de Prueba',
    assignedToType: 'space' as const,
    assignedToId: 'space-abc',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2025-07-01T00:00:00.000Z',
    status: 'draft' as const,
    maxAttempts: 2,
    active: true,
    createdBy: 'u1',
    auditTrail: [
      { action: 'QUIZ_ASSIGNMENT_CREATE', userId: 'u1', userEmail: 'admin@test.com', timestamp: '2025-05-01T00:00:00.000Z', details: 'Asignación creada' },
    ],
    createdAt: '2025-05-01T00:00:00.000Z',
    updatedAt: '2025-05-01T00:00:00.000Z',
  },
  {
    _id: 'a2',
    tenantId: 't1',
    examConfigId: 'cfg2',
    examConfigName: 'Examen Avanzado',
    assignedToType: 'user' as const,
    assignedToId: 'user-xyz',
    startDate: '2025-05-01T00:00:00.000Z',
    endDate: '2025-08-01T00:00:00.000Z',
    status: 'published' as const,
    maxAttempts: 0,
    active: true,
    createdBy: 'u1',
    auditTrail: [
      { action: 'QUIZ_ASSIGNMENT_CREATE', userId: 'u1', userEmail: 'admin@test.com', timestamp: '2025-04-01T00:00:00.000Z', details: 'Asignación creada' },
      { action: 'QUIZ_ASSIGNMENT_PUBLISHED', userId: 'u1', userEmail: 'admin@test.com', timestamp: '2025-04-02T00:00:00.000Z', details: 'Asignación publicada' },
    ],
    createdAt: '2025-04-01T00:00:00.000Z',
    updatedAt: '2025-04-01T00:00:00.000Z',
  },
];

// ── Helper: fill the create form ───────────────────────
// Uses fireEvent.change for datetime-local (more reliable in jsdom than userEvent.type)

async function fillCreateForm({
  examConfigId = 'cfg1',
  assignedToId = 'space-42',
  startDate = '2025-06-01T00:00',
  endDate = '2025-07-01T00:00',
}: {
  examConfigId?: string;
  assignedToId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const user = userEvent.setup();

  // Select exam config
  const configSelect = screen.getByDisplayValue('Seleccionar configuración...');
  await user.selectOptions(configSelect, examConfigId);

  // Type assignedToId
  const idInput = screen.getByPlaceholderText('ID...');
  await user.type(idInput, assignedToId);

  // Fill datetime-local inputs via DOM query (most reliable in jsdom)
  const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
  if (dateInputs.length >= 2) {
    fireEvent.change(dateInputs[0], { target: { value: startDate } });
    fireEvent.change(dateInputs[1], { target: { value: endDate } });
  }
}

// ── Tests ──────────────────────────────────────────────

describe('AssignmentsList — Create Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExamConfigs.mockResolvedValue([
      { _id: 'cfg1', name: 'Examen de Prueba' },
      { _id: 'cfg2', name: 'Examen Avanzado' },
    ]);
  });

  it('should render the list and open create modal on button click', async () => {
    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    expect(screen.getByRole('heading', { name: 'Examen de Prueba' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Examen Avanzado' })).toBeDefined();

    await user.click(screen.getByText('Nueva Asignación'));

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });
  });

  it('should open modal automatically when showCreateForm is true', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    expect(mockGetExamConfigs).toHaveBeenCalledTimes(1);
  });

  it('should show validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    await user.click(screen.getByText('Crear'));

    await waitFor(() => {
      const errors = screen.getAllByText('Campo requerido');
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });

    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('should show date validation error when endDate is before startDate', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    await fillCreateForm({ startDate: '2025-07-01T00:00', endDate: '2025-06-01T00:00' });

    await userEvent.setup().click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(screen.getByText('La fecha de fin debe ser posterior a la de inicio')).toBeDefined();
    });

    expect(mockCreateAssignment).not.toHaveBeenCalled();
  });

  it('should call createAssignmentAction and show success toast on valid submit', async () => {
    mockCreateAssignment.mockResolvedValue({ success: true, id: 'new-id' });

    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    await fillCreateForm();

    await userEvent.setup().click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mockCreateAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          examConfigId: 'cfg1',
          assignedToType: 'space',
          assignedToId: expect.stringContaining('space-42'),
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Asignación creada');
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('should show error toast when createAssignmentAction returns error', async () => {
    mockCreateAssignment.mockResolvedValue({ success: false, error: 'Config not found' });

    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    await fillCreateForm();

    await userEvent.setup().click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Config not found');
    });
  });

  it('should show generic error toast when createAssignmentAction throws', async () => {
    mockCreateAssignment.mockRejectedValue(new Error('Network error'));

    render(<AssignmentsList assignments={mockAssignments} locale="es" showCreateForm />);

    await waitFor(() => {
      expect(screen.getByText('Crear Asignación')).toBeDefined();
    });

    await fillCreateForm();

    await userEvent.setup().click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al crear la asignación');
    });
  });

  it('should render empty state when no assignments', () => {
    render(<AssignmentsList assignments={[]} locale="es" />);

    expect(screen.getByText('No hay asignaciones')).toBeDefined();
  });
});

describe('AssignmentsList — Edit Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExamConfigs.mockResolvedValue([
      { _id: 'cfg1', name: 'Examen de Prueba' },
      { _id: 'cfg2', name: 'Examen Avanzado' },
    ]);
  });

  it('should open edit modal with pre-filled data when pencil button is clicked', async () => {
    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    // Click the first pencil (edits 'a1')
    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    // Verify pre-filled data
    expect(screen.getByDisplayValue('space-abc')).toBeDefined();
    expect(screen.getByDisplayValue('2')).toBeDefined();

    // Verify datetime-local values are pre-filled (sliced from ISO)
    const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    expect(dateInputs[0].value).toBe('2025-06-01T00:00');
    expect(dateInputs[1].value).toBe('2025-07-01T00:00');

    // Verify submit button shows "GUARDAR CAMBIOS" (edit mode)
    expect(screen.getByText('GUARDAR CAMBIOS')).toBeDefined();
  });

  it('should call updateAssignmentAction on submit and show success toast', async () => {
    mockUpdateAssignment.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    // Open edit for 'a1'
    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    // Click the save button
    await user.click(screen.getByText('GUARDAR CAMBIOS'));

    await waitFor(() => {
      expect(mockUpdateAssignment).toHaveBeenCalledTimes(1);
    });

    // Called with the assignment id and original data
    expect(mockUpdateAssignment).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        examConfigId: 'cfg1',
        assignedToType: 'space',
        assignedToId: 'space-abc',
        maxAttempts: 2,
      })
    );

    expect(mockToastSuccess).toHaveBeenCalledWith('Asignación actualizada con éxito');
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('should show error toast when updateAssignmentAction returns error', async () => {
    mockUpdateAssignment.mockResolvedValue({ success: false, error: 'No se puede modificar examen' });

    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    await user.click(screen.getByText('GUARDAR CAMBIOS'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('No se puede modificar examen');
    });
  });

  it('should show generic error toast when updateAssignmentAction throws', async () => {
    mockUpdateAssignment.mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    await user.click(screen.getByText('GUARDAR CAMBIOS'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al actualizar la asignación');
    });
  });

  it('should validate form before submitting update (invalid dates)', async () => {
    mockUpdateAssignment.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    // Open edit for 'a1'
    const editButtons = screen.getAllByTitle('Editar');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    // Change the endDate to be before the startDate (triggers validationInvalidDates)
    const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(dateInputs[1], { target: { value: '2025-05-01T00:00' } });

    // Click save — should fail validation because endDate < startDate
    await user.click(screen.getByText('GUARDAR CAMBIOS'));

    await waitFor(() => {
      expect(screen.getByText('La fecha de fin debe ser posterior a la de inicio')).toBeDefined();
    });

    // updateAssignmentAction should NOT have been called
    expect(mockUpdateAssignment).not.toHaveBeenCalled();
  });

  it('should respect published field lock when editing a published assignment', async () => {
    render(<AssignmentsList assignments={mockAssignments} locale="es" />);

    // Open edit for 'a2' (published)
    const editButtons = screen.getAllByTitle('Editar');
    await userEvent.setup().click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('EDITAR ASIGNACIÓN')).toBeDefined();
    });

    // The assignedToId input should be disabled for published assignments
    const idInput = screen.getByDisplayValue('user-xyz');
    expect(idInput).toHaveProperty('disabled', true);

    // The maxAttempts input should NOT be disabled (not a locked field)
    const attemptsInput = screen.getByDisplayValue('0');
    expect(attemptsInput).toHaveProperty('disabled', false);
  });
});
