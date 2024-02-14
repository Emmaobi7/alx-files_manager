import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(url, {useUnifiedTopology: true})
    this.client.connect();
    this.users = this.client.db().collection('users')
    this.files = this.client.db().collection('files')
  }

  isAlive() {
    return !!this.client && !!this.client.topology && this.client.topology.isConnected()
  }


  async nbUsers () {
    const nb = await this.client.db().collection('users').countDocuments();
    return nb
  }

  async nbFiles() {
    const nb = await this.client.db().collection('files').countDocuments();
    return nb;
  }
}

const dbClient = new DBClient();
export default dbClient;
