/*
 * Copyright © 2007,2008,2009  Red Hat, Inc.
 * Copyright © 2011,2012  Google, Inc.
 *
 *  This is part of HarfBuzz, a text shaping library.
 *
 * Permission is hereby granted, without written agreement and without
 * license or royalty fees, to use, copy, modify, and distribute this
 * software and its documentation for any purpose, provided that the
 * above copyright notice and the following two paragraphs appear in
 * all copies of this software.
 *
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
 * ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN
 * IF THE COPYRIGHT HOLDER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
 * DAMAGE.
 *
 * THE COPYRIGHT HOLDER SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING,
 * BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE COPYRIGHT HOLDER HAS NO OBLIGATION TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 *
 * Red Hat Author(s): Behdad Esfahbod
 * Google Author(s): Behdad Esfahbod
 */

#ifndef HB_PRIVATE_HH
#define HB_PRIVATE_HH

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "hb.h"
#define HB_H_IN
#ifdef HAVE_OT
#include "hb-ot.h"
#define HB_OT_H_IN
#endif

#include <stdlib.h>
#include <stddef.h>
#include <string.h>
#include <assert.h>

/* We only use these two for debug output.  However, the debug code is
 * always seen by the compiler (and optimized out in non-debug builds.
 * If including these becomes a problem, we can start thinking about
 * someway around that. */
#include <stdio.h>
#include <errno.h>
#include <stdarg.h>



/* Essentials */

#ifndef NULL
# define NULL ((void *) 0)
#endif


/* Basics */


#undef MIN
template <typename Type> static inline Type MIN (const Type &a, const Type &b) { return a < b ? a : b; }

#undef MAX
template <typename Type> static inline Type MAX (const Type &a, const Type &b) { return a > b ? a : b; }


#undef  ARRAY_LENGTH
#define ARRAY_LENGTH(__array) ((signed int) (sizeof (__array) / sizeof (__array[0])))

#define HB_STMT_START do
#define HB_STMT_END   while (0)

#define _ASSERT_STATIC1(_line, _cond)	typedef int _static_assert_on_line_##_line##_failed[(_cond)?1:-1]
#define _ASSERT_STATIC0(_line, _cond)	_ASSERT_STATIC1 (_line, (_cond))
#define ASSERT_STATIC(_cond)		_ASSERT_STATIC0 (__LINE__, (_cond))

#define ASSERT_STATIC_EXPR(_cond)((void) sizeof (char[(_cond) ? 1 : -1]))
#define ASSERT_STATIC_EXPR_ZERO(_cond) (0 * sizeof (char[(_cond) ? 1 : -1]))

#define _PASTE1(a,b) a##b
#define PASTE(a,b) _PASTE1(a,b)

/* Lets assert int types.  Saves trouble down the road. */

ASSERT_STATIC (sizeof (int8_t) == 1);
ASSERT_STATIC (sizeof (uint8_t) == 1);
ASSERT_STATIC (sizeof (int16_t) == 2);
ASSERT_STATIC (sizeof (uint16_t) == 2);
ASSERT_STATIC (sizeof (int32_t) == 4);
ASSERT_STATIC (sizeof (uint32_t) == 4);
ASSERT_STATIC (sizeof (int64_t) == 8);
ASSERT_STATIC (sizeof (uint64_t) == 8);

ASSERT_STATIC (sizeof (hb_codepoint_t) == 4);
ASSERT_STATIC (sizeof (hb_position_t) == 4);
ASSERT_STATIC (sizeof (hb_mask_t) == 4);
ASSERT_STATIC (sizeof (hb_var_int_t) == 4);


/* We like our types POD */

#define _ASSERT_TYPE_POD1(_line, _type)	union _type_##_type##_on_line_##_line##_is_not_POD { _type instance; }
#define _ASSERT_TYPE_POD0(_line, _type)	_ASSERT_TYPE_POD1 (_line, _type)
#define ASSERT_TYPE_POD(_type)		_ASSERT_TYPE_POD0 (__LINE__, _type)

#ifdef __GNUC__
# define _ASSERT_INSTANCE_POD1(_line, _instance) \
	HB_STMT_START { \
		typedef __typeof__(_instance) _type_##_line; \
		_ASSERT_TYPE_POD1 (_line, _type_##_line); \
	} HB_STMT_END
#else
# define _ASSERT_INSTANCE_POD1(_line, _instance)	typedef int _assertion_on_line_##_line##_not_tested
#endif
# define _ASSERT_INSTANCE_POD0(_line, _instance)	_ASSERT_INSTANCE_POD1 (_line, _instance)
# define ASSERT_INSTANCE_POD(_instance)			_ASSERT_INSTANCE_POD0 (__LINE__, _instance)

/* Check _assertion in a method environment */
#define _ASSERT_POD1(_line) \
	inline void _static_assertion_on_line_##_line (void) const \
	{ _ASSERT_INSTANCE_POD1 (_line, *this); /* Make sure it's POD. */ }
# define _ASSERT_POD0(_line)	_ASSERT_POD1 (_line)
# define ASSERT_POD()		_ASSERT_POD0 (__LINE__)



/* Misc */


#if defined(__GNUC__) && (__GNUC__ > 2) && defined(__OPTIMIZE__)
#define _HB_BOOLEAN_EXPR(expr) ((expr) ? 1 : 0)
#define likely(expr) (__builtin_expect (_HB_BOOLEAN_EXPR(expr), 1))
#define unlikely(expr) (__builtin_expect (_HB_BOOLEAN_EXPR(expr), 0))
#else
#define likely(expr) (expr)
#define unlikely(expr) (expr)
#endif

#ifndef __GNUC__
#undef __attribute__
#define __attribute__(x)
#endif

#if __GNUC__ >= 3
#define HB_PURE_FUNC	__attribute__((pure))
#define HB_CONST_FUNC	__attribute__((const))
#define HB_PRINTF_FUNC(format_idx, arg_idx) __attribute__((__format__ (__printf__, format_idx, arg_idx)))
#else
#define HB_PURE_FUNC
#define HB_CONST_FUNC
#define HB_PRINTF_FUNC(format_idx, arg_idx)
#endif
#if __GNUC__ >= 4
#define HB_UNUSED	__attribute__((unused))
#else
#define HB_UNUSED
#endif

#ifndef HB_INTERNAL
# ifndef __MINGW32__
#  define HB_INTERNAL __attribute__((__visibility__("hidden")))
# else
#  define HB_INTERNAL
# endif
#endif


#if (defined(__WIN32__) && !defined(__WINE__)) || defined(_MSC_VER)
#define snprintf _snprintf
#endif

#ifdef _MSC_VER
#undef inline
#define inline __inline
#endif

#ifdef __STRICT_ANSI__
#undef inline
#define inline __inline__
#endif


#if __GNUC__ >= 3
#define HB_FUNC __PRETTY_FUNCTION__
#elif defined(_MSC_VER)
#define HB_FUNC __FUNCSIG__
#else
#define HB_FUNC __func__
#endif


/* Return the number of 1 bits in mask. */
static inline HB_CONST_FUNC unsigned int
_hb_popcount32 (uint32_t mask)
{
#if __GNUC__ > 3 || (__GNUC__ == 3 && __GNUC_MINOR__ >= 4)
  return __builtin_popcount (mask);
#else
  /* "HACKMEM 169" */
  register uint32_t y;
  y = (mask >> 1) &033333333333;
  y = mask - y - ((y >>1) & 033333333333);
  return (((y + (y >> 3)) & 030707070707) % 077);
#endif
}

/* Returns the number of bits needed to store number */
static inline HB_CONST_FUNC unsigned int
_hb_bit_storage (unsigned int number)
{
#if defined(__GNUC__) && (__GNUC__ >= 4) && defined(__OPTIMIZE__)
  return likely (number) ? (sizeof (unsigned int) * 8 - __builtin_clz (number)) : 0;
#else
  register unsigned int n_bits = 0;
  while (number) {
    n_bits++;
    number >>= 1;
  }
  return n_bits;
#endif
}

/* Returns the number of zero bits in the least significant side of number */
static inline HB_CONST_FUNC unsigned int
_hb_ctz (unsigned int number)
{
#if defined(__GNUC__) && (__GNUC__ >= 4) && defined(__OPTIMIZE__)
  return likely (number) ? __builtin_ctz (number) : 0;
#else
  register unsigned int n_bits = 0;
  if (unlikely (!number)) return 0;
  while (!(number & 1)) {
    n_bits++;
    number >>= 1;
  }
  return n_bits;
#endif
}

static inline bool
_hb_unsigned_int_mul_overflows (unsigned int count, unsigned int size)
{
  return (size > 0) && (count >= ((unsigned int) -1) / size);
}


/* Type of bsearch() / qsort() compare function */
typedef int (*hb_compare_func_t) (const void *, const void *);




/* arrays and maps */


#define HB_PREALLOCED_ARRAY_INIT {0}
template <typename Type, unsigned int StaticSize>
struct hb_prealloced_array_t
{
  unsigned int len;
  unsigned int allocated;
  Type *array;
  Type static_array[StaticSize];

  void init (void) { memset (this, 0, sizeof (*this)); }

  inline Type& operator [] (unsigned int i) { return array[i]; }
  inline const Type& operator [] (unsigned int i) const { return array[i]; }

  inline Type *push (void)
  {
    if (!array) {
      array = static_array;
      allocated = ARRAY_LENGTH (static_array);
    }
    if (likely (len < allocated))
      return &array[len++];

    /* Need to reallocate */
    unsigned int new_allocated = allocated + (allocated >> 1) + 8;
    Type *new_array = NULL;

    if (array == static_array) {
      new_array = (Type *) calloc (new_allocated, sizeof (Type));
      if (new_array)
        memcpy (new_array, array, len * sizeof (Type));
    } else {
      bool overflows = (new_allocated < allocated) || _hb_unsigned_int_mul_overflows (new_allocated, sizeof (Type));
      if (likely (!overflows)) {
	new_array = (Type *) realloc (array, new_allocated * sizeof (Type));
      }
    }

    if (unlikely (!new_array))
      return NULL;

    array = new_array;
    allocated = new_allocated;
    return &array[len++];
  }

  inline void pop (void)
  {
    len--;
    /* TODO: shrink array if needed */
  }

  inline void shrink (unsigned int l)
  {
     if (l < len)
       len = l;
    /* TODO: shrink array if needed */
  }

  template <typename T>
  inline Type *find (T v) {
    for (unsigned int i = 0; i < len; i++)
      if (array[i] == v)
	return &array[i];
    return NULL;
  }
  template <typename T>
  inline const Type *find (T v) const {
    for (unsigned int i = 0; i < len; i++)
      if (array[i] == v)
	return &array[i];
    return NULL;
  }

  inline void sort (void)
  {
    qsort (array, len, sizeof (Type), (hb_compare_func_t) Type::cmp);
  }

  inline void sort (unsigned int start, unsigned int end)
  {
    qsort (array + start, end - start, sizeof (Type), (hb_compare_func_t) Type::cmp);
  }

  template <typename T>
  inline Type *bsearch (T *key)
  {
    return (Type *) ::bsearch (key, array, len, sizeof (Type), (hb_compare_func_t) Type::cmp);
  }
  template <typename T>
  inline const Type *bsearch (T *key) const
  {
    return (const Type *) ::bsearch (key, array, len, sizeof (Type), (hb_compare_func_t) Type::cmp);
  }

  inline void finish (void)
  {
    if (array != static_array)
      free (array);
    array = NULL;
    allocated = len = 0;
  }
};


#define HB_LOCKABLE_SET_INIT {HB_PREALLOCED_ARRAY_INIT}
template <typename item_t, typename lock_t>
struct hb_lockable_set_t
{
  hb_prealloced_array_t <item_t, 2> items;

  inline void init (void) { items.init (); }

  template <typename T>
  inline item_t *replace_or_insert (T v, lock_t &l, bool replace)
  {
    l.lock ();
    item_t *item = items.find (v);
    if (item) {
      if (replace) {
	item_t old = *item;
	*item = v;
	l.unlock ();
	old.finish ();
      }
      else {
        item = NULL;
	l.unlock ();
      }
    } else {
      item = items.push ();
      if (likely (item))
	*item = v;
      l.unlock ();
    }
    return item;
  }

  template <typename T>
  inline void remove (T v, lock_t &l)
  {
    l.lock ();
    item_t *item = items.find (v);
    if (item) {
      item_t old = *item;
      *item = items[items.len - 1];
      items.pop ();
      l.unlock ();
      old.finish ();
    } else {
      l.unlock ();
    }
  }

  template <typename T>
  inline bool find (T v, item_t *i, lock_t &l)
  {
    l.lock ();
    item_t *item = items.find (v);
    if (item)
      *i = *item;
    l.unlock ();
    return !!item;
  }

  template <typename T>
  inline item_t *find_or_insert (T v, lock_t &l)
  {
    l.lock ();
    item_t *item = items.find (v);
    if (!item) {
      item = items.push ();
      if (likely (item))
        *item = v;
    }
    l.unlock ();
    return item;
  }

  inline void finish (lock_t &l)
  {
    l.lock ();
    while (items.len) {
      item_t old = items[items.len - 1];
	items.pop ();
	l.unlock ();
	old.finish ();
	l.lock ();
    }
    items.finish ();
    l.unlock ();
  }

};




/* Big-endian handling */

static inline uint16_t hb_be_uint16 (const uint16_t v)
{
  const uint8_t *V = (const uint8_t *) &v;
  return (uint16_t) (V[0] << 8) + V[1];
}

/* Note, of the following macros, uint16_get is the one called many many times.
 * If there is any optimizations to be done, it's in that macro.  However, I
 * already confirmed that on my T400 ThinkPad at least, using bswap_16(), which
 * results in a single ror instruction, does NOT speed this up.  In fact, it
 * resulted in a minor slowdown.  At any rate, note that v may not be correctly
 * aligned, so I think the current implementation is optimal.
 */

#define hb_be_uint16_put(v,V)	HB_STMT_START { v[0] = (V>>8); v[1] = (V); } HB_STMT_END
#define hb_be_uint16_get(v)	(uint16_t) ((v[0] << 8) + v[1])
#define hb_be_uint16_eq(a,b)	(a[0] == b[0] && a[1] == b[1])

#define hb_be_uint32_put(v,V)	HB_STMT_START { v[0] = (V>>24); v[1] = (V>>16); v[2] = (V>>8); v[3] = (V); } HB_STMT_END
#define hb_be_uint32_get(v)	(uint32_t) ((v[0] << 24) + (v[1] << 16) + (v[2] << 8) + v[3])
#define hb_be_uint32_eq(a,b)	(a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3])


/* ASCII tag/character handling */

static inline unsigned char ISALPHA (unsigned char c)
{ return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
static inline unsigned char ISALNUM (unsigned char c)
{ return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'); }
static inline unsigned char TOUPPER (unsigned char c)
{ return (c >= 'a' && c <= 'z') ? c - 'a' + 'A' : c; }
static inline unsigned char TOLOWER (unsigned char c)
{ return (c >= 'A' && c <= 'Z') ? c - 'A' + 'a' : c; }

#define HB_TAG_CHAR4(s)   (HB_TAG(((const char *) s)[0], \
				  ((const char *) s)[1], \
				  ((const char *) s)[2], \
				  ((const char *) s)[3]))


/* C++ helpers */

/* Makes class uncopyable.  Use in private: section. */
#define NO_COPY(T) \
  T (const T &o); \
  T &operator = (const T &o)


/* Debug */


#ifndef HB_DEBUG
#define HB_DEBUG 0
#endif

static inline bool
_hb_debug (unsigned int level,
	   unsigned int max_level)
{
  return level < max_level;
}

#define DEBUG_LEVEL(WHAT, LEVEL) (_hb_debug ((LEVEL), HB_DEBUG_##WHAT))
#define DEBUG(WHAT) (DEBUG_LEVEL (WHAT, 0))

template <int max_level> inline void
_hb_debug_msg_va (const char *what,
		  const void *obj,
		  const char *func,
		  bool indented,
		  unsigned int level,
		  int level_dir,
		  const char *message,
		  va_list ap)
{
  if (!_hb_debug (level, max_level))
    return;

  fprintf (stderr, "%-10s", what ? what : "");

  if (obj)
    fprintf (stderr, "(%0*lx) ", (unsigned int) (2 * sizeof (void *)), (unsigned long) obj);
  else
    fprintf (stderr, " %*s  ", (unsigned int) (2 * sizeof (void *)), "");

  if (indented) {
    static const char bars[] = "││││││││││││││││││││││││││││││││││││││││";
    fprintf (stderr, "%2d %s├%s",
	     level,
	     bars + sizeof (bars) - 1 - MIN ((unsigned int) sizeof (bars), 3 * level),
	     level_dir ? (level_dir > 0 ? "╮" : "╯") : "╴");
  } else
    fprintf (stderr, "   ├╴");

  if (func) {
    /* If there's a class name, just write that. */
    const char *dotdot = strstr (func, "::");
    const char *space = strchr (func, ' ');
    if (space && dotdot && space < dotdot)
      func = space + 1;
    unsigned int func_len = dotdot ? dotdot - func : strlen (func);
    fprintf (stderr, "%.*s: ", func_len, func);
  }

  if (message)
    vfprintf (stderr, message, ap);

  fprintf (stderr, "\n");
}
template <> inline void
_hb_debug_msg_va<0> (const char *what HB_UNUSED,
		     const void *obj HB_UNUSED,
		     const char *func HB_UNUSED,
		     bool indented HB_UNUSED,
		     unsigned int level HB_UNUSED,
		     int level_dir HB_UNUSED,
		     const char *message HB_UNUSED,
		     va_list ap HB_UNUSED) {}

template <int max_level> inline void
_hb_debug_msg (const char *what,
	       const void *obj,
	       const char *func,
	       bool indented,
	       unsigned int level,
	       int level_dir,
	       const char *message,
	       ...) HB_PRINTF_FUNC(7, 8);
template <int max_level> inline void
_hb_debug_msg (const char *what,
	       const void *obj,
	       const char *func,
	       bool indented,
	       unsigned int level,
	       int level_dir,
	       const char *message,
	       ...)
{
  va_list ap;
  va_start (ap, message);
  _hb_debug_msg_va<max_level> (what, obj, func, indented, level, level_dir, message, ap);
  va_end (ap);
}
template <> inline void
_hb_debug_msg<0> (const char *what HB_UNUSED,
		  const void *obj HB_UNUSED,
		  const char *func HB_UNUSED,
		  bool indented HB_UNUSED,
		  unsigned int level HB_UNUSED,
		  int level_dir HB_UNUSED,
		  const char *message HB_UNUSED,
		  ...) HB_PRINTF_FUNC(7, 8);
template <> inline void
_hb_debug_msg<0> (const char *what HB_UNUSED,
		  const void *obj HB_UNUSED,
		  const char *func HB_UNUSED,
		  bool indented HB_UNUSED,
		  unsigned int level HB_UNUSED,
		  int level_dir HB_UNUSED,
		  const char *message HB_UNUSED,
		  ...) {}

#define DEBUG_MSG_LEVEL(WHAT, OBJ, LEVEL, LEVEL_DIR, ...)	_hb_debug_msg<HB_DEBUG_##WHAT> (#WHAT, (OBJ), NULL,    true, (LEVEL), (LEVEL_DIR), __VA_ARGS__)
#define DEBUG_MSG(WHAT, OBJ, ...) 				_hb_debug_msg<HB_DEBUG_##WHAT> (#WHAT, (OBJ), NULL,    false, 0, 0, __VA_ARGS__)
#define DEBUG_MSG_FUNC(WHAT, OBJ, ...)				_hb_debug_msg<HB_DEBUG_##WHAT> (#WHAT, (OBJ), HB_FUNC, false, 0, 0, __VA_ARGS__)


/*
 * Trace
 */

template <int max_level>
struct hb_auto_trace_t {
  explicit inline hb_auto_trace_t (unsigned int *plevel_,
				   const char *what_,
				   const void *obj_,
				   const char *func,
				   const char *message,
				   ...) : plevel (plevel_), what (what_), obj (obj_), returned (false)
  {
    if (plevel) ++*plevel;

    va_list ap;
    va_start (ap, message);
    _hb_debug_msg_va<max_level> (what, obj, func, true, plevel ? *plevel : 0, +1, message, ap);
    va_end (ap);
  }
  inline ~hb_auto_trace_t (void)
  {
    if (unlikely (!returned)) {
      fprintf (stderr, "OUCH, returned with no call to TRACE_RETURN.  This is a bug, please report.  Level was %d.\n", plevel ? *plevel : -1);
      _hb_debug_msg<max_level> (what, obj, NULL, true, plevel ? *plevel : 1, -1, " ");
      return;
    }

    if (plevel) --*plevel;
  }

  inline bool ret (bool v)
  {
    if (unlikely (returned)) {
      fprintf (stderr, "OUCH, double calls to TRACE_RETURN.  This is a bug, please report.\n");
      return v;
    }

    _hb_debug_msg<max_level> (what, obj, NULL, true, plevel ? *plevel : 1, -1, "return %s", v ? "true" : "false");
    if (plevel) --*plevel;
    plevel = NULL;
    returned = true;
    return v;
  }

  private:
  unsigned int *plevel;
  bool returned;
  const char *what;
  const void *obj;
};
template <> /* Optimize when tracing is disabled */
struct hb_auto_trace_t<0> {
  explicit inline hb_auto_trace_t (unsigned int *plevel_ HB_UNUSED,
				   const char *what HB_UNUSED,
				   const void *obj HB_UNUSED,
				   const char *func HB_UNUSED,
				   const char *message HB_UNUSED,
				   ...) {}

  template <typename T>
  inline T ret (T v) { return v; }
};

#define TRACE_RETURN(RET) trace.ret (RET)

/* Misc */


/* Pre-mature optimization:
 * Checks for lo <= u <= hi but with an optimization if lo and hi
 * are only different in a contiguous set of lower-most bits.
 */
template <typename T> inline bool
hb_in_range (T u, T lo, T hi)
{
  if ( ((lo^hi) & lo) == 0 &&
       ((lo^hi) & hi) == (lo^hi) &&
       ((lo^hi) & ((lo^hi) + 1)) == 0 )
    return (u & ~(lo^hi)) == lo;
  else
    return lo <= u && u <= hi;
}


/* Useful for set-operations on small enums.
 * For example, for testing "x ∈ {x1, x2, x3}" use:
 * (FLAG(x) & (FLAG(x1) | FLAG(x2) | FLAG(x3)))
 */
#define FLAG(x) (1<<(x))


template <typename T> inline void
hb_bubble_sort (T *array, unsigned int len, int(*compar)(const T *, const T *))
{
  if (unlikely (!len))
    return;

  unsigned int k = len - 1;
  do {
    unsigned int new_k = 0;

    for (unsigned int j = 0; j < k; j++)
      if (compar (&array[j], &array[j+1]) > 0) {
        T t;
	t = array[j];
	array[j] = array[j + 1];
	array[j + 1] = t;

	new_k = j;
      }
    k = new_k;
  } while (k);
}




#endif /* HB_PRIVATE_HH */