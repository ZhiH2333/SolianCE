import { Avatar } from 'react-native-paper';

interface UserAvatarProps {
  uri: string;
  name: string;
  size?: number;
}

export default function UserAvatar({ uri, name, size = 40 }: UserAvatarProps) {
  if (uri) {
    return <Avatar.Image size={size} source={{ uri }} />;
  }
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return <Avatar.Text size={size} label={initials} />;
}
