import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TitleBar } from '@renderer/components/TitleBar'
import { SplashScreen } from '@renderer/screens/SplashScreen'
import { AuthScreen } from '@renderer/screens/AuthScreen'
import { HomeScreen } from '@renderer/screens/HomeScreen'
import { useAuthStore } from '@renderer/store/authStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { useSkillsStore } from '@renderer/store/skillsStore'
import { useAgentsStore } from '@renderer/store/agentsStore'
import { useChatStore } from '@renderer/store/chatStore'
import { useUsageStore } from '@renderer/store/usageStore'

function App(): JSX.Element {
  const init = useAuthStore((state) => state.init)
  const status = useAuthStore((state) => state.status)
  const { loadSettings, resetSettings } = useSettingsStore((state) => ({
    loadSettings: state.load,
    resetSettings: state.reset
  }))
  const { loadSkills, resetSkills } = useSkillsStore((state) => ({
    loadSkills: state.load,
    resetSkills: state.reset
  }))
  const { loadAgents, resetAgents } = useAgentsStore((state) => ({
    loadAgents: state.load,
    resetAgents: state.reset
  }))
  const { loadChats, resetChats } = useChatStore((state) => ({
    loadChats: state.load,
    resetChats: state.reset
  }))
  const resetUsage = useUsageStore((state) => state.reset)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings()
      loadSkills()
      loadAgents()
      loadChats()
    } else if (status === 'unauthenticated') {
      resetSettings()
      resetSkills()
      resetAgents()
      resetChats()
      resetUsage()
    }
  }, [
    status,
    loadSettings,
    resetSettings,
    loadSkills,
    resetSkills,
    loadAgents,
    resetAgents,
    loadChats,
    resetChats,
    resetUsage
  ])

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/dashboard" element={<HomeScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
