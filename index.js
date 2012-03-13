
function head (a) {
  return a[0]
}

function last (a) {
  return a[a.length - 1]
}

function tail(a) {
  return a.slice(1)
}

function advance (e) {
  return e.shift()
}

function retreat (e) {
  return e.pop()
}

function hasLength (e) {
  return e.length
}

function any(ary, test) {
  for(var i in ary)
    if(test(ary[i]))
      return true
  return false
}

function equal(a, b) {
  if(a.length != b.length) return false
  for(var i in a) {
    if(a[i] !== b[i]) return false
  }
  return true
}

function concat (a, b) {
  if(!Array.isArray(b))
    return a.push(b)
  while(b.length)
    a.push(b.shift())
}


exports.lcs = 
function lcs(a, b) {
  var cache = {}
  var args = [].slice.call(arguments)
  var lcses = []
 
  function key (a,b){
    return a.length + ':' + b.length
  }

  function recurse (a, b) {

    if(!a.length || !b.length) return []
    //avoid exponential time by caching the results
    if(cache[key(a, b)]) return cache[key(a, b)]

    if(a[0] == b[0])
      return [head(a)].concat(recurse(tail(a), tail(b)))
    else { 
      var _a = recurse(tail(a), b)
      var _b = recurse(a, tail(b))
      return cache[key(a,b)] = _a.length > _b.length ? _a : _b  
    }
  }

  if(!args.length) return []
  if(args.length == 1) return args.shift()
  if(args.length > 2) {
    //if called with multiple sequences
    //recurse, since lcs(a, b, c, d) == lcs(lcs(a,b), lcs(c,d))
    args.push(lcs(args.shift(), args.shift()))
    return lcs.apply(null, args)
  }
  return recurse.apply(null, args)
}

// given n sequences, calc the lcs, and then chunk strings into stable and unstable sections.
// chunk(sequences, build)
// build should be (stable, unstable)
// either stable or unstable will be passed. but never both.
exports.chunk =
function (q, build) {
  var q = q.map(function (e) { return e.slice() })
  var lcs = exports.lcs.apply(null, q)

  function matchLcs (e) {
    return last(e) == last(lcs) || ((e.length + lcs.length) === 0)
  }

  while(any(q, hasLength)) {
    //if each element is at the lcs then this chunk is stable.
    var stable = [], unstable = []
    while(q.every(matchLcs) && q.every(hasLength) ) {
      stable.unshift(retreat(lcs))
      q.forEach(retreat)
      console.log('.', q)
    }

    build(q[0].length, stable)

    //collect the changes in each array upto the next match with the lcs
    var c = false
    var unstable = q.map(function (e) {
      var change = []
      while(!matchLcs(e)) {
        change.unshift(retreat(e))
        c = true
      }
      return change
    })
    if(c)
      build(q[0].length, null, unstable)
  
  }
}

exports.diff =
function (a, b) {
  var changes = []
  // hmm, don't use stable here...
  // do i even need it?
  exports.chunk([a, b], function (index, _, unstable) {
    if(unstable) {
      var del = unstable.shift().length
      var insert = unstable.shift()
      changes.push([index, del].concat(insert))
    }
  })
  return changes
}

// http://en.wikipedia.org/wiki/Concestor
// me, concestor, you...
exports.merge = function () {
  var args = [].slice.call(arguments)
  var r = []
  exports.chunk(args, function (index, stable, unstable) {

    if(stable)
      r = stable.concat(r)
    else {
      unstable = unstable.slice()
      var _o = unstable.splice(1, 1)[0]
      console.log('CONCESTOR', _o, unstable)
      console.log('INDEX', index)
      // there are special rules when for changes at the end?
      r = [].concat(resolve(_o, unstable)).concat(r)
       
    }
  })
  return r
}

// generate a list of changes between a and b.
// changes are stored in the format of arguments to splice.
// index, numToDelete, ...itemsToInstert
// THIS IS NEARLY EXACTLY LIKE merge() !!
/*
exports._diff = 
function diff (a , b) {
  a = a.slice()
  b = b.slice()
  var lcs = exports.lcs(a, b)

  function matchLcs (e) {
    return head(e) == head(lcs) || ((e.length + lcs.length) === 0)
  }

 //how to print a diff.
  //iterate through lcs.
  //if first item in a is not present, it must have been deleted.
  //if first item in b is not present, it must have been added.
  var l = a.length
  var changes = []
  while(any([a, b], hasLength)) {
    var index = l - a.length, del = 0, insert = []

    while(!matchLcs(a)) {//(head(a) != head(lcs)) && a.length) {
      del ++
      a.shift()
    }
    while(!matchLcs(b)) {
      insert.push(b.shift())
    }
    //we must now be at a point that all three lists are equall. 
    if(del || insert.length)  {
      insert.splice(0, 0, index, del)
      //store changes in reverse order,
      //so that you can apply insertions and deletes to the end of the list
      //without affecting the indexes at the start of the list.
      changes.unshift(insert)
    }
    lcs.shift()
    a.shift()
    b.shift()
  }
  return changes
}
*/
exports.patch = function (a, changes, mutate) {
  if(mutate !== true) a = a.slice(a)//copy a
  changes.forEach(function (change) {
    [].splice.apply(a, change)
  })
  return a
}

// merge changes in b since o into a
// simpler algorithm, but same result as diff3

var rules = [
  function oddOneOut (con, changes) {
    //changes.splice(1, 0, con)
    changes = changes.slice()
    changes.unshift(con)
    
    // find the odd one out in changes.
    // ie, the only one not equal to the first one.
    // but what if the first one is the odd one?
    // -- try again with the second one, skipping the first.
    // (already compared that)
    // if that returned false, then all 
    var odd = null, c = 0
    console.log('changes', changes)      
    for (var i = 1; i < changes.length; i ++) {
        if(!equal(changes[0], changes[i])) {
          odd = changes[i], c++
        }
    } 
      console.log('c = ', c, 'odd:', odd)
    if(c > 1) {
      c = 0
      odd = changes[0] //since we know it's different
      for (var i = 2; i < changes.length; i ++) {
          if(!equal(changes[1], changes[i]))
            odd = changes[i], c++
      }

      console.log('c = ', c, 'odd:', odd)
      if(c == 0) //this means that the concestor was the odd one.
        return changes[1] //that means the changes are the same 'false conflict'
      else {
        var nonempty
        for (var i = 1; i < changes.length; i++)
          if(changes[i].length) 
            if(!nonempty)
              nonempty = changes[i]
            else
              return
          
        return nonempty// full confilct
        //hang on, if there is only one (decendant) item not empty
        //then merge that, because the others where deletes
      }
    } 
    else // c must be 1
      return odd
   
    return head(changes)
  }
]

function resolve (concestor, changes) {
  var l = rules.length
  for (var i in rules) {
    var c = rules[i](concestor, changes)
    if(c) return c
  }
  //apply merge rules in order.
  //if there is only one non empty change, use that.
  return {'?': changes}
}
/*
exports._merge =
function () { //mine, concestor, yours
  var args = [].slice.call(arguments).map(function (e) { return e.slice() })
  var lcs = exports.lcs.apply(null, args)
  var r = []

  function matchLcs (e) {
    return head(e) == head(lcs) || ((e.length + lcs.length) === 0)
  }

  while(any(args, hasLength)) {
    //if each element is at the lcs then this chunk is stable.
    if(args.every(matchLcs)) {
      r.push(lcs.shift())
      args.forEach(advance)
    } else {
      //collect the changes in each array upto the next match with the lcs
      console.log(args, 'lcs:',lcs)
      var changes = args.map(function (e) {
        var change = []
        while(!matchLcs(e))
           change.push(advance(e))
        return change
      })
     var _o = changes.splice(1,1)[0] //get o from the list
      //if each item in changes are equal, 
      //  then it's a 'false conflict'
      //if at most one array in changes is non empty
      //  then that is a non-conflicting unstable chunk
      //if there are more than one different non empty list
      //  then that is a merge conflict!
      concat(r, resolve(_o, changes))
    } 
  }
  return r
}
*/