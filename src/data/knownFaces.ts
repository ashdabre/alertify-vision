
interface KnownFace {
  id: string;
  name: string;
  imageUrl: string;
  category: 'user' | 'celebrity';
}

// This is a simple database of known faces
export const knownFaces: KnownFace[] = [
  {
    id: 'ashal',
    name: 'ASHAL',
    imageUrl: '/lovable-uploads/220e9480-454a-42c0-910b-d83696066ac6.png',
    category: 'user'
  },
  {
    id: 'tom-cruise',
    name: 'Tom Cruise',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Tom_Cruise_by_Gage_Skidmore_2.jpg',
    category: 'celebrity'
  },
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.png',
    category: 'celebrity'
  },
  {
    id: 'leonardo-dicaprio',
    name: 'Leonardo DiCaprio',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Leonardo_Dicaprio_Cannes_2019.jpg',
    category: 'celebrity'
  },
  {
    id: 'beyonce',
    name: 'Beyoncé',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png',
    category: 'celebrity'
  }
];
