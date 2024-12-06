const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Schéma GraphQL
const schema = buildSchema(`
  type Query {
    user(id: ID!): User
    usersByName(name: String!): [User]
    post(id: ID!): Post
    posts: [Post]
  }

  type Mutation {
    addPost(
      title: String!, 
      content: String!, 
      authorId: ID!
    ): Post
  }

  type User {
    id: ID!
    name: String
    email: String
    posts: [Post]
  }

  type Post {
    id: ID!
    title: String
    content: String
    author: User
  }
`);

// Données simulées
const users = [
  { id: "0", name: 'Alice', email: 'alice@example.com' },
  { id: "1", name: 'Bob', email: 'bob@example.com' }
];

const posts = [
  { id: "0", title: 'Alice', content: 'contenu pour alice', author: "0" },
];

// Résolveurs

const root = {
  user: ({ id }) => {
    const user = users.find(user => user.id === id);
    if (user) {
      user.posts = posts.filter(post => post.author === user.id);
    }
    return user;
  },

  usersByName: ({ name }) => {
    return users.filter(user => user.name.toLowerCase().includes(name.toLowerCase()));
  },

  post: ({ id }) => {
    const post = posts.find(post => post.id === id);
    if (post) {
      post.author = users.find(user => user.id === post.author);
    }
    return post;
  },

  posts: () => {
    return posts.map(post => {
      return {
        ...post,
        author: users.find(user => user.id === post.author)
      };
    });
  },

  addPost: ({ title, content, authorId }) => {
    const newPost = { id: String(posts.length + 1), title, content, author: authorId };
    posts.push(newPost);
    return newPost;
  }
};

// Création du serveur Express
const app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

// Lancement du serveur
app.listen(4000, () => console.log('Serveur GraphQL lancé sur http://localhost:4000/graphql'));
