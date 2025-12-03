
import { Post, User, Photo } from '../types';

// CURRENT USER (MOCK)
export const CURRENT_USER: User = {
    id: 'user_me',
    username: 'traveler',
    displayName: 'Traveler',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a3694c2dd77?w=150&h=150&fit=crop&crop=faces',
    bio: 'Capturing the analog world digitally.',
    followers: 124,
    following: 86
};

// MOCK DATA
const MOCK_USERS: Record<string, User> = {
    'user_1': {
        id: 'user_1',
        username: 'sarah_f',
        displayName: 'Sarah F.',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
        bio: 'Film enthusiast.',
        followers: 1200,
        following: 400
    },
    'user_2': {
        id: 'user_2',
        username: 'kai_zen',
        displayName: 'Kai',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
        bio: 'Tokyo based.',
        followers: 850,
        following: 300
    }
};

// In-memory feed storage (resets on reload, mimicking DB)
let FEED_POSTS: Post[] = [
    {
        id: 'post_1',
        userId: 'user_1',
        user: MOCK_USERS['user_1'],
        // Using placeholder images for mock, in real app these come from Supabase bucket
        mainImageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80', 
        frameUrls: [], // No animation for mock placeholders
        caption: 'Late night walks in Shibuya.',
        locationName: 'TOKYO, JAPAN',
        timestamp: Date.now() - 3600000,
        likes: 42,
        likedByMe: false
    },
    {
        id: 'post_2',
        userId: 'user_2',
        user: MOCK_USERS['user_2'],
        mainImageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
        frameUrls: [],
        caption: 'First roll of the summer.',
        locationName: 'KYOTO, JAPAN',
        timestamp: Date.now() - 86400000,
        likes: 89,
        likedByMe: true
    }
];

export const getFeed = async (): Promise<Post[]> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));
    return [...FEED_POSTS].sort((a, b) => b.timestamp - a.timestamp);
};

export const getMyProfile = async (): Promise<{ user: User, posts: Post[] }> => {
    await new Promise(r => setTimeout(r, 400));
    const myPosts = FEED_POSTS.filter(p => p.userId === CURRENT_USER.id);
    return { user: CURRENT_USER, posts: myPosts };
};

// Convert a local developed Photo into a Public Post
export const uploadPost = async (photo: Photo): Promise<void> => {
    await new Promise(r => setTimeout(r, 1500)); // Simulate upload
    
    if (!photo.processedUrl) throw new Error("Cannot upload undeveloped photo");

    const newPost: Post = {
        id: `post_${Date.now()}`,
        userId: CURRENT_USER.id,
        user: CURRENT_USER,
        mainImageUrl: photo.processedUrl,
        frameUrls: photo.processedFrames || photo.frames || [],
        caption: photo.caption || '',
        locationName: 'POSTED VIA HIPPOCAM', // In real app, extract from photo metadata
        timestamp: Date.now(),
        likes: 0,
        likedByMe: false
    };

    FEED_POSTS.unshift(newPost);
};
