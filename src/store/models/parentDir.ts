import { Module } from 'vuex'
import { ipcRenderer } from 'electron'
import { ParentDirModel } from '@/background/models/directory'

interface ParentDirListModel extends ParentDirModel {
  isLoading: boolean;
}

interface ParnetDirState {
  list: ParentDirListModel[];
}

const parentDir: Module<ParnetDirState, {}> = {
  namespaced: true,
  state () {
    return {
      list: []
    }
  },
  mutations: {
    add (state, parentDir: ParentDirListModel) {
      state.list.push(parentDir)
    },
    deleteByPath (state, nowPath: string) {
      const dirPaths = state.list.map(item => item.nowPath)
      const findDirByPath = dirPaths.indexOf(nowPath)
      if (findDirByPath !== -1) state.list.splice(findDirByPath, 1)
    },
    modifyByPath<T extends ParentDirListModel> (state: ParnetDirState, { nowPath, replace }: { nowPath: string; replace: T }) {
      const dirPaths = state.list.map(item => item.nowPath)
      const findDirByPath = dirPaths.indexOf(nowPath)
      if (findDirByPath !== -1) {
        state.list[findDirByPath] = Object.assign(state.list[findDirByPath], replace)
      }
    }
  },
  actions: {
    load ({ commit }) {
      ipcRenderer.send('db_parentDirListLoad')
      ipcRenderer.once('db_parentDirListLoad_reply', (ev, args: ParentDirListModel[]) => {
        args.forEach(item => {
          commit('add', item)
        })
      })
    },
    add ({ commit }, { name, nowPath, isLoading }) {
      commit('add', { name, nowPath, isLoading, process: 'start' })

      ipcRenderer.send('db_insertDir', { nowPath, name })
      return new Promise(resolve => {
        ipcRenderer.once('db_insertDir_reply-setStructure', () => {
          commit('modifyByPath', { nowPath, replace: { process: 'setting structure...' } })
        })
        ipcRenderer.once('db_insertDir_reply-insertDb', () => {
          commit('modifyByPath', { nowPath, replace: { process: 'insert at db...' } })
        })
        ipcRenderer.once('db_insertDir_reply', (ev, status) => {
          if (status) {
            commit('modifyByPath', { nowPath, replace: { isLoading: false, process: '' } })
            resolve(true)
          } else {
            commit('deleteByPath', nowPath)
            resolve(false)
          }
        })
      })
    }
  }
}

export default parentDir
