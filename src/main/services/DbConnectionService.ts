import { Service } from '../../shared/kernel'
import { MainContext } from '../context'
import { DataSource } from 'typeorm'
import { StudentEntity } from '../db/entities/StudentEntity'
import { ReasonEntity } from '../db/entities/ReasonEntity'
import { ScoreEventEntity } from '../db/entities/ScoreEventEntity'
import { SettlementEntity } from '../db/entities/SettlementEntity'
import { SettingEntity } from '../db/entities/SettingEntity'
import { TagEntity } from '../db/entities/TagEntity'
import { StudentTagEntity } from '../db/entities/StudentTagEntity'
import { parsePostgreSQLConnectionString } from '../db/DbManager'

declare module '../../shared/kernel' {
  interface Context {
    dbConnection: DbConnectionService
  }
}

export class DbConnectionService extends Service {
  private testDataSource: DataSource | null = null

  constructor(ctx: MainContext) {
    super(ctx, 'dbConnection')
    this.registerIpc()
  }

  private get mainCtx() {
    return this.ctx as MainContext
  }

  private registerIpc() {
    this.mainCtx.handle('db:testConnection', async (_event, connectionString: string) => {
      const result = await this.testConnection(connectionString)
      return { success: true, data: result }
    })

    this.mainCtx.handle('db:switchConnection', async (_event, connectionString: string) => {
      try {
        const result = await this.switchConnection(connectionString)
        return { success: true, data: result }
      } catch (error: any) {
        return { success: false, message: error?.message || '切换失败' }
      }
    })

    this.mainCtx.handle('db:getStatus', async () => {
      const status = this.getStatus()
      return { success: true, data: status }
    })

    this.mainCtx.handle('db:sync', async () => {
      const db = this.mainCtx.db
      const result = await db.syncToRemote()
      return { success: result.success, data: result }
    })
  }

  async testConnection(connectionString: string): Promise<{ success: boolean; error?: string }> {
    const config = parsePostgreSQLConnectionString(connectionString)
    if (!config) {
      return { success: false, error: '无效的 PostgreSQL 连接字符串格式' }
    }

    try {
      if (this.testDataSource) {
        await this.testDataSource.destroy()
      }

      this.testDataSource = new DataSource({
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        extra: {
          ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
          sslmode: config.sslmode,
          channelBinding: config.channelBinding
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
        synchronize: false,
        logging: false,
        connectTimeoutMS: 10000
      })

      await this.testDataSource.initialize()
      await this.testDataSource.destroy()
      this.testDataSource = null

      return { success: true }
    } catch (error: any) {
      if (this.testDataSource) {
        try {
          await this.testDataSource.destroy()
        } catch {}
        this.testDataSource = null
      }
      console.error('PostgreSQL connection test failed:', error)
      return { success: false, error: error?.message || '连接失败' }
    }
  }

  async switchConnection(connectionString: string): Promise<{ type: 'sqlite' | 'postgresql' }> {
    if (!connectionString) {
      // 切换到 SQLite
      const result = await this.mainCtx.db.switchConnection(undefined)
      await this.mainCtx.settings.setValue('pg_connection_string', '')
      await this.mainCtx.settings.setValue('pg_connection_status', {
        connected: true,
        type: 'sqlite'
      })
      return result
    }

    const testResult = await this.testConnection(connectionString)
    if (!testResult.success) {
      await this.mainCtx.settings.setValue('pg_connection_status', {
        connected: false,
        type: 'postgresql',
        error: testResult.error
      })
      throw new Error(testResult.error || '连接测试失败')
    }

    // 切换到 PostgreSQL
    const result = await this.mainCtx.db.switchConnection(connectionString)
    await this.mainCtx.settings.setValue('pg_connection_string', connectionString)
    await this.mainCtx.settings.setValue('pg_connection_status', {
      connected: true,
      type: 'postgresql'
    })

    return result
  }

  getStatus(): { type: 'sqlite' | 'postgresql'; connected: boolean; error?: string } {
    const status = this.mainCtx.settings.getValue('pg_connection_status')
    if (status) {
      return status
    }
    return { type: 'sqlite', connected: true }
  }
}
