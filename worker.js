import Queue from 'bull';
import dbClient from './utils/db'
import fs from 'fs';
const imageThumbnail = require('image-thumbnail')

const fileQueue = new Queue('fileQueue');


const generateThumbnail = async (filePath, size) => {
  const thumbnail = await imageThumbnail(filePath, size)
  return fs.writeFileAsync(`${filePath}_${size}`, thumbnail)
}

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data
  if (!fileId) {
    throw new Error('Missing fileId')
  }

  if (!userId) {
    throw new Error('Missing UserId')
  }

  const file = await dbClient.files.findOne({fileId, userId})
  if (!file) {
    throw new Error('File not found')
  }
  const size = [500, 250, 100]
  await Promise.all(size.map((s) => generateThumbnail(file.localPath, size)))
  done();
})
