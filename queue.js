 function queue(parallelism) {
     var q,
-        tasks = [],
-        started = 0, // number of tasks that have been started (and perhaps finished)
-        active = 0, // number of tasks currently being executed (started but not finished)
-        remaining = 0, // number of tasks not yet finished
+        tasks = [], // deferred functions or their return value
+        results = [], // results passed by task callback functions
+        started = 0, // count of tasks started (and perhaps finished)
+        active = 0, // count of running tasks (started but not finished)
+        remaining = 0, // count of outstanding tasks
         popping, // inside a synchronous task callback?
         error = null,
         await = noop,
 @@ -21,41 +22,53 @@
             a = slice.call(t, 1);
         a.push(callback(i));
         ++active;
-        t[0].apply(null, a);
+        tasks[i] = t[0].apply(null, a);
       }
     }
 
     function callback(i) {
       return function(e, r) {
         --active;
+        tasks[i] = null;
         if (error != null) return;
         if (e != null) {
-          error = e; // ignore new tasks and squelch active callbacks
-          started = remaining = NaN; // stop queued tasks from starting
-          notify();
+          abort(e);
         } else {
-          tasks[i] = r;
+          results[i] = r;
           if (--remaining) popping || pop();
           else notify();
         }
       };
     }
 
+    function abort(e) {
+      error = e; // ignore new tasks and squelch active callbacks
+      started = remaining = NaN; // stop queued tasks from starting
+      notify();
+    }
+
     function notify() {
       if (error != null) await(error);
-      else if (all) await(error, tasks);
-      else await.apply(null, [error].concat(tasks));
+      else if (all) await(error, results);
+      else await.apply(null, [error].concat(results));
     }
 
     return q = {
       defer: function() {
-        if (!error) {
+        if (error == null) {
           tasks.push(arguments);
           ++remaining;
           pop();
         }
         return q;
       },
+      abort: function() {
+        if (error == null) {
+          for (var i = 0, t; i < started; ++i) (t = tasks[i]) && t.abort && t.abort();
+          abort(new Error("cancelled"));
+        }
+        return q;
+      },
       await: function(f) {
         await = f;
         all = false;
         if (!remaining) notify();
         return q;
       },
       awaitAll: function(f) {
         await = f;
         all = true;
         if (!remaining) notify();
         return q;
       }
     };
   }
 
   function noop() {}
 
   queue.version = "1.0.7";
   if (typeof define === "function" && define.amd) define(function() { return queue; });
   else if (typeof module === "object" && module.exports) module.exports = queue;
   else this.queue = queue;
 })();
