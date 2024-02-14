import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
const express = require('express');
const router = express.Router();

//get routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
router.get('/files/:id', FilesController.getShow)
router.get('/files', FilesController.getIndex)
router.get('/files/:id/data', FilesController.getFile)


//post routes
router.post('/users', UsersController.postNew);
router.post('/files', FilesController.postUpload);


//put routes
router.put('/files/:id/publish', FilesController.putPublish)
router.put('/files/:id/publish', FilesController.putUnPublish)

export default router
