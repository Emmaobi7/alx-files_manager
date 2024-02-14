import { createClient } from "redis";
const { promisify } = require('util');


class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.connected = true;
    this.client
      .on('error', function(err) {
        this.client.connected = false;
        console.log(err)
      })
   
    this.clientAsyncGet = promisify(this.client.get).bind(this.client);
    this.clientAsyncDel = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key){
    const value = await this.clientAsyncGet(key);
    return value;
  }

  async set(key, value, time) {
    await this.client.setex(key, time, value)
  }

  async del(key) {
    await this.clientAsyncDel(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
