/**
 * Board permission roles
 * 
 * Hierarchy: viewer < editor < owner
 * 
 * Rules:
 * - owner: Full control (can delete board, manage members, edit everything)
 * - editor: Can create/edit/delete cards, lists, add members (default for board members)
 * - viewer: Read-only access (workspace members who are not board members)
 */

export enum BoardRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}

/**
 * Check if a role has sufficient permission
 * @param userRole The user's current role
 * @param requiredRole The minimum required role
 * @returns true if user has sufficient permission
 */
export function hasPermission(userRole: BoardRole | null, requiredRole: BoardRole): boolean {
  if (!userRole) return false;
  
//   const roleHierarchy: Record<BoardRole, string> = {
//     [BoardRole.VIEWER]: viewer.board._id  ,
//     [BoardRole.EDITOR]: editor.board._id,
//     [BoardRole.OWNER]: owner.board._id,
//   };
  const roleHierarchy: Record<BoardRole, number> = {
    [BoardRole.VIEWER]: 0,
    [BoardRole.EDITOR]:1,
    [BoardRole.OWNER]: 2,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
