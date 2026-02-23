/**
 * 风控用 in-memory store：支持 incr/get/set + addSet/hasSet，带 TTL
 * key 建议含 date(YYYYMMDD) 便于日切
 */
const cache = new Map();
const setExpiry = new Map();
const setMembers = new Map();
const setExpiryByKey = new Map();

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function prune(key) {
  const exp = setExpiry.get(key);
  if (exp && nowSec() > exp) {
    cache.delete(key);
    setExpiry.delete(key);
    setMembers.delete(key);
    setExpiryByKey.delete(key);
  }
}

function incr(key, ttlSec) {
  prune(key);
  const v = (cache.get(key) || 0) + 1;
  cache.set(key, v);
  if (ttlSec) setExpiry.set(key, nowSec() + ttlSec);
  return v;
}

function get(key) {
  prune(key);
  return cache.get(key);
}

function set(key, value, ttlSec) {
  prune(key);
  cache.set(key, value);
  if (ttlSec) setExpiry.set(key, nowSec() + ttlSec);
}

function addSet(key, member, ttlSec) {
  let s = setMembers.get(key);
  if (!s) {
    s = new Set();
    setMembers.set(key, s);
  }
  if (setExpiryByKey.get(key) && nowSec() > setExpiryByKey.get(key)) {
    setMembers.delete(key);
    setExpiryByKey.delete(key);
    s = new Set();
    setMembers.set(key, s);
  }
  s.add(member);
  if (ttlSec) setExpiryByKey.set(key, nowSec() + ttlSec);
}

function hasSet(key, member) {
  const exp = setExpiryByKey.get(key);
  if (exp && nowSec() > exp) {
    setMembers.delete(key);
    setExpiryByKey.delete(key);
    return false;
  }
  const s = setMembers.get(key);
  return s ? s.has(member) : false;
}

function getSetSize(key) {
  const exp = setExpiryByKey.get(key);
  if (exp && nowSec() > exp) {
    setMembers.delete(key);
    setExpiryByKey.delete(key);
    return 0;
  }
  const s = setMembers.get(key);
  return s ? s.size : 0;
}

module.exports = {
  incr,
  get,
  set,
  addSet,
  hasSet,
  getSetSize,
};
