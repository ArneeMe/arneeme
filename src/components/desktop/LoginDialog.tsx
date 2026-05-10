import { useState } from 'preact/hooks';
import { advanceBoot } from '../../stores/boot';

export function LoginDialog() {
  const [username, setUsername] = useState('Arne');
  const [password, setPassword] = useState('');

  const onSubmit = (e: Event) => {
    e.preventDefault();
    advanceBoot('desktop');
  };

  return (
    <div class="boot-overlay login-phase">
      <form class="window login-dialog" onSubmit={onSubmit}>
        <div class="title-bar">
          <div class="title-bar-text">Skriv inn nettverkspassord</div>
          <div class="title-bar-controls">
            <button type="button" aria-label="Lukk" onClick={() => advanceBoot('desktop')} />
          </div>
        </div>
        <div class="window-body login-body">
          <div class="login-icon">🔑</div>
          <div class="login-fields">
            <p class="login-prompt">Skriv inn nettverkspassordet ditt for Microsoft-nettverk.</p>

            <div class="field-row-stacked">
              <label for="login-user">Brukernavn:</label>
              <input
                id="login-user"
                type="text"
                value={username}
                onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="field-row-stacked">
              <label for="login-pass">Passord:</label>
              <input
                id="login-pass"
                type="password"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </div>
        <div class="login-actions">
          <button type="submit">OK</button>
          <button type="button" onClick={() => advanceBoot('desktop')}>Avbryt</button>
        </div>
      </form>
    </div>
  );
}
