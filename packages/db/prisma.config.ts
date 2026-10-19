export default {
  schema: "./prisma/schema.prisma",
  datasource: {
    url:
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgresql://sakhi:sakhi@localhost:54320/sakhiline_test",
  },
};
