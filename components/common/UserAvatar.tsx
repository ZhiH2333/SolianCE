import { Avatar } from 'react-native-paper';
import { Image } from 'react-native';

interface UserAvatarProps {
  uri: string;
  name: string;
  size?: number;
}

export default function UserAvatar({ uri, name, size = 40 }: UserAvatarProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return <Avatar.Text size={size} label={initials} />;
}
