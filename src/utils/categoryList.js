const extractCategoryList = (data) => [
  data,
  data?.categories,
  data?.content,
  data?.data,
  data?.data?.categories,
  data?.data?.content,
  data?.result,
  data?.result?.categories,
  data?.payload,
  data?.payload?.categories,
].find(Array.isArray) || null;

export default extractCategoryList;
