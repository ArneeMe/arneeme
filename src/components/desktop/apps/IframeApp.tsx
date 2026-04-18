interface Props {
  instanceId: string;
  url: string;
}

export default function IframeApp({ url }: Props) {
  return (
    <iframe
      src={url}
      title={url}
      style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
    />
  );
}
