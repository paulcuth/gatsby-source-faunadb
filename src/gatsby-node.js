const faunadb = require("faunadb");
const q = faunadb.query;

exports.sourceNodes = async (
  { actions, createNodeId, createContentDigest },
  options
) => {
  const { createNode } = actions;
  const { secret, domain, type, index, arguments: args = [] } = options;

  const client = new faunadb.Client({
    secret,
    domain
  });

  try {
    const size =
      options.size != null ? options.size + 1 : q.Count(q.Var("result"));

    const documents = await client.query(
      q.Let(
        { result: q.Match(q.Index(index), ...args) },
        q.Map(
          q.Select("data", q.Paginate(q.Var("result"), { size })),
          q.Lambda("ref", q.Get(q.Var("ref")))
        )
      )
    );

    documents.forEach(document => {
      const id = document.ref.id || document.ref["@ref"].id;
      if (document.data == null) {
        return;
      }

      createNode({
        ...document.data,
        id: createNodeId(`faunadb-${type}-${id}`),
        _id: document.ref.id,
        _ts: document.ts,
        parent: null,
        children: [],
        internal: {
          type: type,
          content: JSON.stringify(document.data),
          contentDigest: createContentDigest(document.data)
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
};
