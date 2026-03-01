import { Context, Service } from '../../shared/kernel'
import { DataSource } from 'typeorm'
import path from 'path'
import fs from 'fs'
import { StudentEntity } from './entities/StudentEntity'
import { ReasonEntity } from './entities/ReasonEntity'
import { ScoreEventEntity } from './entities/ScoreEventEntity'
import { SettlementEntity } from './entities/SettlementEntity'
import { SettingEntity } from './entities/SettingEntity'
import { TagEntity } from './entities/TagEntity'
import { StudentTagEntity } from './entities/StudentTagEntity'
import { migrations } from './migrations'

declare module '../../shared/kernel' {
  interface Context {
    db: DbManager
  }
}

interface PostgreSQLConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  ssl?: boolean
  sslmode?: string
  channelBinding?: string
}

interface QueueItem {
  id: string
  operation: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: Error) => void
  timestamp: number
}

export function parsePostgreSQLConnectionString(connectionString: string): PostgreSQLConfig | null {
  if (!connectionString.startsWith('postgresql://')) {
    return null
  }

  try {
    const url = new URL(connectionString)
    const config: PostgreSQLConfig = {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      username: url.username,
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.slice(1),
      ssl: false
    }

    const params = new URLSearchParams(url.search)
    if (params.get('sslmode')) {
      config.ssl = true
      config.sslmode = params.get('sslmode') || 'require'
    }
    if (params.get('channel_binding')) {
      config.channelBinding = params.get('channel_binding') || 'require'
    }

    return config
  } catch (e) {
    console.error('Failed to parse PostgreSQL connection string:', e)
    return null
  }
}

export class DbManager extends Service {
  private _dataSource: DataSource | null = null
  private _isPostgreSQL: boolean = false
  private dbPath: string
  private operationQueue: QueueItem[] = []
  private isProcessingQueue: boolean = false
  private queueIdCounter: number = 0

  constructor(ctx: Context, dbPath: string, pgConnectionString?: string) {
    super(ctx, 'db')
    this.dbPath = dbPath
    this._isPostgreSQL = !!pgConnectionString
  }

  get dataSource(): DataSource {
    if (!this._dataSource) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this._dataSource
  }

  get isPostgreSQL(): boolean {
    return this._isPostgreSQL
  }

  private createDataSource(pgConnectionString?: string): DataSource {
    const pgConfig = pgConnectionString ? parsePostgreSQLConnectionString(pgConnectionString) : null

    if (pgConfig) {
      this._isPostgreSQL = true
      return new DataSource({
        type: 'postgres',
        host: pgConfig.host,
        port: pgConfig.port,
        username: pgConfig.username,
        password: pgConfig.password,
        database: pgConfig.database,
        ssl: pgConfig.ssl ? { rejectUnauthorized: false } : false,
        extra: {
          ssl: pgConfig.ssl ? { rejectUnauthorized: false } : undefined,
          sslmode: pgConfig.sslmode,
          channelBinding: pgConfig.channelBinding
        },
        entities: [
          StudentEntity,
          ReasonEntity,
          ScoreEventEntity,
          SettlementEntity,
          SettingEntity,
          TagEntity,
          StudentTagEntity
        ],
        migrations,
        synchronize: false,
        logging: false,
        poolSize: 10,
        connectTimeoutMS: 30000
      })
    } else {
      this._isPostgreSQL = false
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }
      return new DataSource({
        type: 'better-sqlite3',
        database: this.dbPath,
        entities: [
          StudentEntity,
          ReasonEntity,
          ScoreEventEntity,
          SettlementEntity,
          SettingEntity,
          TagEntity,
          StudentTagEntity
        ],
        migrations,
        synchronize: false,
        logging: false
      })
    }
  }

  async initialize(pgConnectionString?: string) {
    if (this._dataSource?.isInitialized) {
      await this.dispose()
    }

    this._dataSource = this.createDataSource(pgConnectionString)
    await this._dataSource.initialize()

    if (!this._isPostgreSQL) {
      await this._dataSource.query('PRAGMA foreign_keys = ON')
    }

    await this._dataSource.runMigrations()
  }

  async dispose() {
    if (!this._dataSource?.isInitialized) return
    await this._dataSource.destroy()
    this._dataSource = null
  }

  async switchConnection(pgConnectionString?: string): Promise<{ type: 'sqlite' | 'postgresql' }> {
    await this.dispose()
    await this.initialize(pgConnectionString)
    return { type: this._isPostgreSQL ? 'postgresql' : 'sqlite' }
  }

  getDatabaseType(): 'sqlite' | 'postgresql' {
    return this._isPostgreSQL ? 'postgresql' : 'sqlite'
  }

  async enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem = {
        id: `op-${++this.queueIdCounter}`,
        operation,
        resolve: resolve as (value: any) => void,
        reject,
        timestamp: Date.now()
      }

      this.operationQueue.push(item)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.operationQueue.length > 0) {
      const item = this.operationQueue.shift()!
      try {
        const result = await item.operation()
        item.resolve(result)
      } catch (error) {
        item.reject(error as Error)
      }
    }

    this.isProcessingQueue = false
  }

  async withQueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this._isPostgreSQL) {
      return this.enqueueOperation(operation)
    }
    return operation()
  }

  async syncToRemote(): Promise<{ success: boolean; message?: string }> {
    if (!this._isPostgreSQL) {
      return { success: false, message: '当前不是远程数据库模式' }
    }

    if (!this._dataSource?.isInitialized) {
      return { success: false, message: '数据库未初始化' }
    }

    try {
      return await this.enqueueOperation(async () => {
        await this._dataSource!.query('SELECT 1')
        return { success: true, message: '同步成功' }
      })
    } catch (error: any) {
      return { success: false, message: error?.message || '同步失败' }
    }
  }
}
