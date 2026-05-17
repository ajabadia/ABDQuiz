# ABDQuiz IAM Specification (Identity & Access Management)

Este documento define el sistema de autorización basado en roles y grupos (RBAC + GBAC) para el ecosistema ABDQuiz.

## 1. Modelo de Datos de Identidad

### 1.1 Entidades Core
- **User**: Identidad global única.
- **Tenant**: Universo aislado (Academia, Organización, Centro).
- **Group**: Unidad organizativa dentro del Tenant (Aula, Curso, Departamento).
- **Membership**: Vínculo `User` ↔ `Tenant` (Define el Rol base).
- **GroupMembership**: Vínculo `User` ↔ `Group` (Define el acceso a recursos del grupo).

## 2. Matriz de Autorización (Ejes)

La decisión de acceso se basa en tres ejes:
1. **Entidad**: `question`, `corpus`, `import`, `exam`, `attempt`, `tenant`, `member`.
2. **Acción**: `read`, `create`, `update`, `delete`, `archive`, `retry`, `launch`, `review`.
3. **Alcance (Scope)**:
    - `own`: Solo recursos creados por el usuario.
    - `assigned`: Recursos asignados a sus grupos.
    - `tenant`: Todo el universo del tenant.
    - `global`: Acceso total (Soporte ABD).

## 3. Roles y Permisos Iniciales

| Entidad | Acción | Owner | Admin | Teacher | Student |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **question** | `read/create/update` | ✅ | ✅ | ✅ | ❌ |
| **question** | `delete` | ✅ | ✅ | ❌ | ❌ |
| **corpus** | `import/manage` | ✅ | ✅ | ✅ | ❌ |
| **import** | `retry/delete` | ✅ | ✅ | ❌ | ❌ |
| **exam** | `create/launch` | ✅ | ✅ | ✅ | ❌ |
| **attempt** | `read/review` | ✅ | ✅ | ✅ | `own` |
| **tenant** | `update/config` | ✅ | ✅ | ❌ | ❌ |
| **member** | `invite/role` | ✅ | ✅ | ❌ | ❌ |

## 4. Lógica de Resolución (The `can` Function)

Toda validación debe centralizarse en una función pura:
```typescript
can(user: User, action: Action, entity: Entity, scope?: Scope): boolean
```

### Flujo de resolución:
1. Verificar si el usuario es `Owner` del Tenant (Retornar `true`).
2. Resolver todos los permisos heredados de sus `GroupMembership`.
3. Resolver los permisos de su `Membership` (Rol en el Tenant).
4. Combinar y aplicar la regla de "Permiso Positivo": Si alguna fuente autoriza, el acceso es concedido.

## 5. Implementación Técnica
- **Backend First**: La validación real ocurre en Server Actions y Services.
- **UI Masking**: Los componentes de UI solo ocultan/muestran botones basados en la misma lógica `can`.
- **RBAC Middleware**: Los Route Handlers aplican guards automáticos basados en la ruta.

## 6. Documentación Adicional
- [Federated Handshake Protocol](file:///D:/desarrollos/ABDQuiz/docs/FEDERATED_HANDSHAKE.md): Detalles técnicos de la integración con ABDAuth.

---
**Era 11 - Security Standard: SYS_READY_FOR_PHASE_3**
