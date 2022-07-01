import { createClient } from '@supabase/supabase-js'
import { IDocRef, IQuery } from './orm'
import config from '../config'

const supabase = createClient(config.supabaseUrl, config.supabaseApiKey)

export class SupabaseRef implements IDocRef {
  async get(query: IQuery) {
    const { data } = await supabase
      .from(query.collection)
      .select('*')
      .eq('id', query.id)
      .limit(1)

    return data
  }

  async set(query: IQuery) {
    const { data, error } = await supabase
      .from(query.collection)
      .insert([query.value])

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
}
