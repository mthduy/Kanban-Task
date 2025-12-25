import express from 'express';
import validateBody from '../validations/validateBody.js';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validations/workspace.validation.js';
import { createWorkspace, getWorkspaceById, listWorkspaces, updateWorkspace, deleteWorkspace, leaveWorkspace } from '../controllers/workspaceController.js';


const router = express.Router();

router.post('/', validateBody(createWorkspaceSchema), createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspaceById);
router.put('/:id', validateBody(updateWorkspaceSchema), updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/leave', leaveWorkspace);


export default router;
