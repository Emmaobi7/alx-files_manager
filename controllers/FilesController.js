import dbClient from '../utils/db';
import mime from 'mime-types';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';

class FilesController {
  static async postUpload(req, res) {
    const fileQueue = new Queue('fileQueue')
    const token = req.header('X-Token');  
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    let newFile;
    if (!name) return res.status(400).json({error: 'Missing name'})
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({error: 'Missing type'})
    if (!data && !['folder'].includes(type)) return res.status(400).json({error: 'Missing data'})
    const dbparentId = new ObjectId(parentId)
    if (parentId !== 0) {
      const file = await dbClient.files.findOne({_id: dbparentId})
      if (!file) return res.status(400).json({error: 'parent not found'})
      if (file.type !== 'folder') return res.status(400).json({error: 'parent is not a folder'})
    }
    newFile = {userId: user._id, name, type, isPublic, parentId: parentId === 0 ? parentId: dbparentId}
    if (type === 'folder') {
      const result = await dbClient.files.insertOne(newFile)
      const insertedFile = result.ops[0];
      return res.status(201).json({id: insertedFile._id, userId, name, type, isPublic, parentId})
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true});
    const fileContent = Buffer.from(data, 'base64')
    const fileName = uuidv4();
    const localPath = `${folderPath}/${fileName}`;
    await fs.promises.writeFile(localPath, fileContent, {flag: 'w+'})
    newFile = {userId: user._id, name, type, isPublic, parentId: parentId === 0 ? parentId: dbparentId, localPath}
    const result = await dbClient.files.insertOne(newFile)

    const fileId = result.insertedId.toString();
    if (type === 'image') {
      await fileQueue.add({userId, fileId})
    }

    return res.status(201).json({id: result.ops[0]._id, userId, name, type, isPublic, parentId})
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');  
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }

    const idparam = req.params.id;
    const dbparentId = new ObjectId(idparam)
    const file = await dbClient.files.findOne({_id: dbparentId, userId: user._id})
    if (!file) return res.status(404).json({error: 'Not found'})
    const fileDocument = ({id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic: file.isPublic, parentId: file.parentId})
    return res.json(fileDocument)
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');  
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }

    const parentId = req.query.parentId;
    const page = req.query.page;
    if (!page === undefined || !parentId === undefined) {
      const dataAll = await dbClient.files.find().toArray();
      const list = dataAll.map(file => ({id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic: file.isPublic, parentId: file.parentId}))
      return res.json(list)
    }
    const dbparentId = new ObjectId(parentId)
    const limit = 20;
    const data = await dbClient.files.find({parentId: dbparentId}).toArray()
    const fileList = data.map(file => ({id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic: file.isPublic, parentId: file.parentId}))
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedFiles = fileList.slice(startIndex, endIndex)
    return res.json(fileList)
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');  
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }
    const fileId = req.params.id

    const file = await dbClient.files.findOne({_id: new ObjectId(fileId), userId: user._id}) 
    if (!file) return res.status(404).json({error: 'Not found'})
    const update = await dbClient.files.updateOne({_id: new ObjectId(fileId), userId: user._id}, {$set : {isPublic: true}});
    const fileDocument = ({id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic: file.isPublic, parentId: file.parentId})
    return res.status(200).json(fileDocument)
  }

  static async putUnPublish(req, res) {
    const token = req.header('X-Token');  
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }
    const fileId = req.params.id

    const file = await dbClient.files.findOne({_id: new ObjectId(fileId), userId: user._id}) 
    if (!file) return res.status(404).json({error: 'Not found'})
    const update = await dbClient.files.updateOne({id: new ObjectId(fileId), userId: user._id}, {$set : {isPublic: false}});
    const fileDocument = ({id: file._id, userId: file.userId, name: file.name, type: file.type, isPublic: file.isPublic, parentId: file.parentId})
    return res.status(200).json(fileDocument)
  }

  static async getFile(req, res) {
    const token = req.header('X-Token');  
    let { size } = req.params;
    const userId = await redisClient.get(`auth_${token}`)
    const id = new ObjectId(userId);
    const user = await dbClient.users.findOne({_id: id})
    if (!user) {
      res.status(401).json({error: 'Unauthorized'})
    }
    const fileId = req.params.id
    const file = await dbClient.files.findOne({_id: new ObjectId(fileId), userId: user._id}) 
    if (!file) return res.status(404).json({error: 'Not found'})
    if (!file.isPublic && (!req.user || file.userId !== file.userId)) return res.status(404).json({error: 'Not found'})
    if (file.type === 'folder') return res.status(400).json({error: 'A folder doesn\'t have content'});
    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localpath}_${size}`
    }
    
    if (!fs.existsSync(filePath)) return res.status(404).json({error: 'Not found'})
    const mimeType = mime.lookup(file.name)
    res.setHeader('Content-Type', mimeType)
    fs.createReadStream(localPath).pipe(res);
  }
}


export default FilesController;
