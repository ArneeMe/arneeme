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

const inboxMessages: Message[] = [
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

const deletedMessages: Message[] = [
  {
    id: 'clippy',
    from: 'Clippy <clippy@microsoft.com>',
    subject: 'It looks like you\'re checking email!',
    date: '04/15/1998',
    body: "Hi! It looks like you're reading your email. Would you like help with that?\n\n📎 I noticed you haven't replied to anyone in a while. I can write the perfect response for you!\n\n[Yes please!]  [No thanks]  [Stop asking me this]",
  },
  {
    id: 'nigerian-prince',
    from: 'DR. PRINCE BABATUNDE <prince@nigeria-gov.net>',
    subject: 'URGENT STRICTLY CONFIDENTIAL BUSINESS PROPOSAL!!!',
    date: '04/12/1998',
    body: "DEAR FRIEND,\n\nI AM DR. PRINCE BABATUNDE, SON OF FORMER NIGERIAN OIL MINISTER. I HAVE A MOST URGENT MATTER REQUIRING YOUR ASSISTANCE.\n\nI HAVE $47,000,000 USD TRAPPED IN AN OVERSEAS ACCOUNT. I REQUIRE YOUR BANK DETAILS TO TRANSFER THIS MONEY. YOU WILL RECEIVE 30% AS COMPENSATION.\n\nPLEASE REPLY WITH NAME, ADDRESS, AND BANK ACCOUNT NUMBER IMMEDIATELY.\n\nGOD BLESS YOU.\n\nDR. PRINCE BABATUNDE",
  },
  {
    id: 'bill-gates',
    from: 'Bill Gates <billg@microsoft.com>',
    subject: 'FW: FW: FW: FW: YOU HAVE BEEN SELECTED!!!',
    date: '04/10/1998',
    body: "Forward this email to 10 friends and Bill Gates himself will send you $1000!!! This is NOT a hoax — Microsoft is tracking emails to beta test their new system!!\n\n>> Original message:\n>> I forwarded this and got $500 the next day!! IT WORKS!!\n\n>> Forward to 10 people: $100\n>> Forward to 20 people: $500\n>> Forward to 30 people: $1000\n\nDO NOT BREAK THE CHAIN!!!!!",
  },
  {
    id: 'win98',
    from: 'Microsoft Windows <upgrade@microsoft.com>',
    subject: 'Time to upgrade to Windows 98!',
    date: '04/08/1998',
    body: "Dear Windows 95 User,\n\nWindows 98 is coming later this year and it's going to change everything.\n\n✓ USB support (whatever that is)\n✓ Internet Explorer 4.0 built right in!\n✓ FAT32 file system support\n✓ Crashes in exciting new ways\n\nPre-order now for only $89.99!\n\nP.S. Your computer probably can't run it anyway.",
  },
];

const folders = [
  { id: 'inbox', label: `Inbox (${inboxMessages.length})` },
  { id: 'deleted', label: `Deleted Items (${deletedMessages.length})` },
];

export default function Inbox({ instanceId }: Props) {
  const [selected, setSelected] = useState<string | null>('welcome');
  const [activeFolder, setActiveFolder] = useState('inbox');

  const allMessages = { inbox: inboxMessages, deleted: deletedMessages };
  const visibleMessages = allMessages[activeFolder as keyof typeof allMessages] ?? [];
  const selectedMsg = [...inboxMessages, ...deletedMessages].find((m) => m.id === selected) ?? null;

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
        {visibleMessages.length} message{visibleMessages.length !== 1 ? 's' : ''}{activeFolder === 'deleted' ? ' · These were in your junk folder' : ''}
      </div>
    </div>
  );
}
