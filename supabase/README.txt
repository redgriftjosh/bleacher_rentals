How I setup this folder:
(really just followed these steps: https://supabase.com/docs/guides/local-development/cli/getting-started)
downloaded docker desktop for mac
brew install supabase
supabase init //this created the supabase folder
supabase login 
supabase start //i think you need to actually have docker up and running to do this.
supabase stop // to stop it

Now I'm getting my data from the cloud supabase project.
supabase link //just makes a connection to cloud Db project
supabase db pull //Update remote migration history table? [Y/n] y -- this create migration file
supabase db reset // actually applies the migration file
got an error here...

A couple hours later I found out that I needed to add
SET search_path TO public;
at the very top of the migration file then delete all my docer containers, volumes and images.
then you can run supabase start and supabase db reset and it should work.
I think this is required because docker normally launches with cached data so it's not referencing the changes we made.

So now I have the schema but no actual data.
supabase db dump --data-only > supabase/seed.sql // this creates a seed file with all the data from the cloud db.
supabase db dump --role-only > supabase/roles.sql

then do supabase db reset again and you should have data in your local db

Now youd should be able to do all local stuff with your database and generate a migration file to push to dev and eventually prod

supabase unlink
supabase link (dev db)
supabase db push
I had to repair the remote migration file for some reason but now make a change locally and then do
supabase db diff -f name-of-file
WARNING: The diff tool is not foolproof, so you may need to manually rearrange and modify the generated migration.
Run supabase db reset to verify that the new migration does not generate errors.
then supabase db push

Once you've tested in dev you can push to prod
supabase unlink
supabase link (prod db)
supabase db push