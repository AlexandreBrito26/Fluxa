import { useState } from 'react'
import { useStore } from '../store'

export default function ProfileSwitcher() {
  const { profiles, profileId, switchProfile, addProfile } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const create = (demo: boolean) => {
    if (!name.trim()) return
    addProfile(name.trim(), demo)
    setName('')
    setOpen(false)
  }

  return (
    <div className="profile-switcher">
      <select
        value={profileId}
        onChange={(e) => switchProfile(e.target.value)}
        aria-label="Perfil"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button className="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        + Perfil
      </button>
      {open && (
        <div className="profile-new" role="group" aria-label="Novo perfil">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do perfil (ex.: Loja)"
            aria-label="Nome do perfil"
            autoFocus
          />
          <button onClick={() => create(true)} disabled={!name.trim()}>
            Com dados demo
          </button>
          <button className="ghost" onClick={() => create(false)} disabled={!name.trim()}>
            Começar vazio
          </button>
        </div>
      )}
    </div>
  )
}
