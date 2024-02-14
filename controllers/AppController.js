import redisClient from '../utils/redis';
import dbClient from '../utils/db';


class AppController{
  static getStatus(req, res) {
    const storage_status = {redis: redisClient.isAlive(), db: dbClient.isAlive()}    
    res.status(200)
    res.send(storage_status);
  }

  static async getStats(req, res) {
    const nb = {users: await dbClient.nbUsers(), files: await dbClient.nbFiles()}
    res.status(200)
    res.send(nb)
  }
}

export default AppController;
