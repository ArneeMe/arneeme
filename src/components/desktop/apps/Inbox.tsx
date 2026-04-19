import { useState } from 'preact/hooks';
import { MenuBar } from '../MenuBar';
import { closeWindow } from '../../../stores/desktop';

interface Props {
  instanceId: string;
}

interface Message {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
  link?: { href: string; label: string };
}

const messages: Message[] = [
  {
    id: 'welcome',
    from: 'Arne Natskår',
    subject: 'Welcome to my desktop 👋',
    date: '04/18/1998',
    body: "Hi there! Welcome to my Windows 95-style personal page. Double-click the icons on the desktop to explore my projects and games. Use the Start menu to navigate between apps. Hope you enjoy the nostalgia trip!",
  },
  {
    id: 'github',
    from: 'GitHub',
    subject: 'Follow me on GitHub',
    date: '04/18/1998',
    body: 'Check out my code and open-source projects on GitHub. Pull requests welcome!',
    link: { href: 'https://github.com/ArneeMe', label: 'Open GitHub →' },
  },
  {
    id: 'linkedin',
    from: 'LinkedIn',
    subject: "Let's connect",
    date: '04/17/1998',
    body: "Connect with me on LinkedIn to see my professional experience and background.",
    link: { href: 'https://www.linkedin.com/in/arne-natsk%C3%A5r', label: 'Open LinkedIn →' },
  },
  {
    id: 'email',
    from: 'Arne Natskår',
    subject: 'Email me directly',
    date: '04/16/1998',
    body: 'Prefer email? Feel free to reach out directly at arnejobb@protonmail.com — I read everything.',
    link: { href: 'mailto:arnejobb@protonmail.com', label: 'Send Email →' },
  },
];

const folders = [
  { id: 'inbox', label: `Inbox (${messages.length})` },
  { id: 'sent', label: 'Sent Items' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'deleted', label: 'Deleted Items' },
];

export default function Inbox({ instanceId }: Props) {
  const [selected, setSelected] = useState<string | null>('welcome');
  const [activeFolder, setActiveFolder] = useState('inbox');

  const selectedMsg = messages.find((m) => m.id === selected) ?? null;
  const visibleMessages = activeFolder === 'inbox' ? messages : [];

  const menus = [
    {
      label: 'File',
      items: [{ label: 'Exit', onClick: () => closeWindow(instanceId) }],
    },
    {
      label: 'Help',
      items: [{ label: 'About Outlook Express...', onClick: () => alert('Outlook Express\nWindows 95 Edition') }],
    },
  ];

  return (
    <div class="inbox-app">
      <MenuBar menus={menus} />

      <div class="inbox-body">
        {/* Sidebar */}
        <div class="inbox-sidebar">
          <div class="inbox-sidebar-header">Folders</div>
          {folders.map((f) => (
            <button
              key={f.id}
              class={`inbox-folder-item${activeFolder === f.id ? ' active' : ''}`}
              onClick={() => setActiveFolder(f.id)}
            >
              <img src="/icons/folder.svg" alt="" style={{ width: 14, height: 14, imageRendering: 'pixelated', marginRight: 4 }} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Main pane */}
        <div class="inbox-main">
          {/* Message list */}
          <div class="inbox-list">
            <div class="inbox-list-header">
              <span class="inbox-col-from">From</span>
              <span class="inbox-col-subject">Subject</span>
              <span class="inbox-col-date">Received</span>
            </div>
            {visibleMessages.length === 0 ? (
              <div class="inbox-empty">No messages</div>
            ) : (
              visibleMessages.map((msg) => (
                <button
                  key={msg.id}
                  class={`inbox-row${selected === msg.id ? ' selected' : ''}`}
                  onClick={() => setSelected(msg.id)}
                >
                  <span class="inbox-col-from">{msg.from}</span>
                  <span class="inbox-col-subject">{msg.subject}</span>
                  <span class="inbox-col-date">{msg.date}</span>
                </button>
              ))
            )}
          </div>

          {/* Reading pane */}
          <div class="inbox-reading-pane">
            {selectedMsg ? (
              <>
                <div class="reading-header">
                  <div><strong>From:</strong> {selectedMsg.from}</div>
                  <div><strong>Subject:</strong> {selectedMsg.subject}</div>
                  <div><strong>Date:</strong> {selectedMsg.date}</div>
                </div>
                <div class="reading-body">
                  <p>{selectedMsg.body}</p>
                  {selectedMsg.link && (
                    <a
                      href={selectedMsg.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="about-link"
                      style={{ marginTop: 12, display: 'inline-block' }}
                    >
                      {selectedMsg.link.label}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div class="inbox-empty">Select a message to read</div>
            )}
          </div>
        </div>
      </div>

      <div class="inbox-statusbar">
        {visibleMessages.length} message{visibleMessages.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
