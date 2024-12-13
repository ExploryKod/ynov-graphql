const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Enhanced GraphQL Schema
const schema = buildSchema(`
  type Query {
    # User-related queries
    user(id: ID!): User
    usersByName(name: String!): [User]
    searchUsers(filter: UserSearchInput): [User]

    # Post-related queries
    post(id: ID!): Post
    posts(limit: Int, offset: Int): [Post]
    userPosts(userId: ID!): [Post]

    # Profile-related queries
    profile(userId: ID!): Profile
  }

  type Mutation {
    # User mutations
    createUser(input: UserCreateInput!): User
    updateUser(id: ID!, input: UserUpdateInput!): User
    
    # Post mutations
    addPost(input: PostCreateInput!): Post
    updatePost(id: ID!, input: PostUpdateInput!): Post
    deletePost(id: ID!): Boolean

    # Profile mutations
    updateProfile(userId: ID!, input: ProfileUpdateInput!): Profile
  }

  # User type with more details
  type User {
    id: ID!
    username: String!
    email: String!
    firstName: String
    lastName: String
    dateJoined: String
    profile: Profile
    posts: [Post]
  }

  # Detailed profile type
  type Profile {
    id: ID!
    user: User
    bio: String
    location: String
    website: String
    profilePicture: String
    coverPicture: String
    followers: Int
    following: Int
    socialLinks: [SocialLink]
  }

  # Post type with more attributes
  type Post {
    id: ID!
    title: String
    content: String!
    author: User!
    createdAt: String
    updatedAt: String
    likes: Int
    comments: [Comment]
  }

  # Comment type
  type Comment {
    id: ID!
    content: String!
    author: User!
    createdAt: String
  }

  # Social link type
  type SocialLink {
    platform: String!
    url: String!
  }

  # Input types for creating and updating 
  input UserCreateInput {
    username: String!
    email: String!
    password: String!
    firstName: String
    lastName: String
  }

  input UserUpdateInput {
    email: String
    firstName: String
    lastName: String
  }

  input UserSearchInput {
    username: String
    firstName: String
    lastName: String
  }

  input PostCreateInput {
    title: String
    content: String!
    authorId: ID!
  }

  input PostUpdateInput {
    title: String
    content: String
  }

  input ProfileUpdateInput {
    bio: String
    location: String
    website: String
    profilePicture: String
    coverPicture: String
    socialLinks: [SocialLinkInput]
  }

  input SocialLinkInput {
    platform: String!
    url: String!
  }
`);


const users = [];
const profiles = [];
const posts = [];
let userIdCounter = 0;
let postIdCounter = 0;
let profileIdCounter = 0;


const root = {

  user: ({ id }) => {
    const user = users.find(u => u.id === id);
    if (user) {
      user.posts = posts.filter(post => post.author.id === user.id);
      user.profile = profiles.find(p => p.user.id === user.id);
    }
    return user;
  },

  usersByName: ({ name }) => {
    return users.filter(user => 
      user.firstName.toLowerCase().includes(name.toLowerCase()) || 
      user.lastName.toLowerCase().includes(name.toLowerCase())
    );
  },

  searchUsers: ({ filter }) => {
    return users.filter(user => {
      if (filter.username && !user.username.toLowerCase().includes(filter.username.toLowerCase())) return false;
      if (filter.firstName && !user.firstName.toLowerCase().includes(filter.firstName.toLowerCase())) return false;
      if (filter.lastName && !user.lastName.toLowerCase().includes(filter.lastName.toLowerCase())) return false;
      return true;
    });
  },

  // Post Queries
  post: ({ id }) => {
    const post = posts.find(p => p.id === id);
    if (post) {
      post.author = users.find(u => u.id === post.author.id);
    }
    return post;
  },

  posts: ({ limit = 10, offset = 0 }) => {
    return posts
      .slice(offset, offset + limit)
      .map(post => ({
        ...post,
        author: users.find(u => u.id === post.author.id)
      }));
  },

  userPosts: ({ userId }) => {
    return posts.filter(post => post.author.id === userId);
  },

  profile: ({ userId }) => {
    return profiles.find(p => p.user.id === userId);
  },

  // User Mutations
  createUser: ({ input }) => {
    const newUser = {
      id: String(userIdCounter++),
      ...input,
      dateJoined: new Date().toISOString()
    };
    
    // Create associated profile
    const newProfile = {
      id: String(profileIdCounter++),
      user: newUser,
      bio: '',
      location: '',
      website: '',
      profilePicture: '',
      coverPicture: '',
      followers: 0,
      following: 0,
      socialLinks: []
    };

    users.push(newUser);
    profiles.push(newProfile);

    return newUser;
  },

  updateUser: ({ id, input }) => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    users[userIndex] = { ...users[userIndex], ...input };
    return users[userIndex];
  },

  // Post Mutations
  addPost: ({ input }) => {
    const author = users.find(u => u.id === input.authorId);
    if (!author) throw new Error('Author not found');

    const newPost = {
      id: String(postIdCounter++),
      ...input,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    posts.push(newPost);
    return newPost;
  },

  updatePost: ({ id, input }) => {
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) return null;

    posts[postIndex] = { 
      ...posts[postIndex], 
      ...input, 
      updatedAt: new Date().toISOString() 
    };
    return posts[postIndex];
  },

  deletePost: ({ id }) => {
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) return false;

    posts.splice(postIndex, 1);
    return true;
  },

  // Profile Mutations
  updateProfile: ({ userId, input }) => {
    const profileIndex = profiles.findIndex(p => p.user.id === userId);
    if (profileIndex === -1) return null;

    profiles[profileIndex] = { 
      ...profiles[profileIndex], 
      ...input 
    };
    return profiles[profileIndex];
  }
};

// Express and GraphQL setup
const app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

// Server launch
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`GraphQL Server running on http://localhost:${PORT}/graphql`));

module.exports = { app, root }; // For potential testing