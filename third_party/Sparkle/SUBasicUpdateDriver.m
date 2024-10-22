//
//  SUBasicUpdateDriver.m
//  Sparkle
//
//  Created by Andy Matuschak on 4/23/08.
//  Copyright 2008 Andy Matuschak. All rights reserved.
//

#import "SUBasicUpdateDriver.h"

#import "SUHost.h"
#import "SUDSAVerifier.h"
#import "SUInstaller.h"
#import "SUStandardVersionComparator.h"
#import "SUUnarchiver.h"
#import "SUBinaryDeltaCommon.h"

@implementation SUBasicUpdateDriver

- (void)checkForUpdatesAtURL:(NSURL *)URL host:(SUHost *)aHost
{
	[super checkForUpdatesAtURL:URL host:aHost];
	if ([aHost isRunningOnReadOnlyVolume])
	{
		[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SURunningFromDiskImageError userInfo:[NSDictionary dictionaryWithObject:[NSString stringWithFormat:SULocalizedString(@"%1$@ can't be updated when it's running from a read-only volume like a disk image or an optical drive. Move %1$@ to your Applications folder, relaunch it from there, and try again.", nil), [aHost name]] forKey:NSLocalizedDescriptionKey]]];
		return;
	}

	SUAppcast *appcast = [[SUAppcast alloc] init];
	CFRetain(appcast); // We'll manage the appcast's memory ourselves so we don't have to make it an IV to support GC.
	[appcast release];

	[appcast setDelegate:self];
	[appcast setUserAgentString:[updater userAgentString]];
	[appcast fetchAppcastFromURL:URL];
}

- (id <SUVersionComparison>)versionComparator
{
	id <SUVersionComparison> comparator = nil;

	// Give the delegate a chance to provide a custom version comparator
	if ([[updater delegate] respondsToSelector:@selector(versionComparatorForUpdater:)])
		comparator = [[updater delegate] versionComparatorForUpdater:updater];

	// If we don't get a comparator from the delegate, use the default comparator
	if (!comparator)
		comparator = [SUStandardVersionComparator defaultComparator];

	return comparator;
}

- (BOOL)isItemNewer:(SUAppcastItem *)ui
{
	return [[self versionComparator] compareVersion:[host version] toVersion:[ui versionString]] == NSOrderedAscending;
}

- (BOOL)hostSupportsItem:(SUAppcastItem *)ui
{
	if ([ui minimumSystemVersion] == nil || [[ui minimumSystemVersion] isEqualToString:@""]) { return YES; }
	return [[SUStandardVersionComparator defaultComparator] compareVersion:[ui minimumSystemVersion] toVersion:[SUHost systemVersionString]] != NSOrderedDescending;
}

- (BOOL)itemContainsSkippedVersion:(SUAppcastItem *)ui
{
	NSString *skippedVersion = [host objectForUserDefaultsKey:SUSkippedVersionKey];
	if (skippedVersion == nil) { return NO; }
	return [[self versionComparator] compareVersion:[ui versionString] toVersion:skippedVersion] != NSOrderedDescending;
}

- (BOOL)itemContainsValidUpdate:(SUAppcastItem *)ui
{
	return [self hostSupportsItem:ui] && [self isItemNewer:ui] && ![self itemContainsSkippedVersion:ui];
}

- (void)appcastDidFinishLoading:(SUAppcast *)ac
{
	if ([[updater delegate] respondsToSelector:@selector(updater:didFinishLoadingAppcast:)])
		[[updater delegate] updater:updater didFinishLoadingAppcast:ac];

    SUAppcastItem *item = nil;

	// Now we have to find the best valid update in the appcast.
	if ([[updater delegate] respondsToSelector:@selector(bestValidUpdateInAppcast:forUpdater:)]) // Does the delegate want to handle it?
	{
		item = [[updater delegate] bestValidUpdateInAppcast:ac forUpdater:updater];
	}
	else // If not, we'll take care of it ourselves.
	{
		// Find the first update we can actually use.
		NSEnumerator *updateEnumerator = [[ac items] objectEnumerator];
		do {
			item = [updateEnumerator nextObject];
		} while (item && ![self hostSupportsItem:item]);

		if (binaryDeltaSupported()) {
			SUAppcastItem *deltaUpdateItem = [[item deltaUpdates] objectForKey:[host version]];
			if (deltaUpdateItem && [self hostSupportsItem:deltaUpdateItem]) {
				nonDeltaUpdateItem = [item retain];
				item = deltaUpdateItem;
			}
		}
	}

    updateItem = [item retain];
	if (ac) { CFRelease(ac); } // Remember that we're explicitly managing the memory of the appcast.
	if (updateItem == nil) { [self didNotFindUpdate]; return; }

	if ([self itemContainsValidUpdate:updateItem])
		[self didFindValidUpdate];
	else
		[self didNotFindUpdate];
}

- (void)appcast:(SUAppcast *)ac failedToLoadWithError:(NSError *)error
{
	if (ac) { CFRelease(ac); } // Remember that we're explicitly managing the memory of the appcast.
	[self abortUpdateWithError:error];
}

- (void)didFindValidUpdate
{
	if ([[updater delegate] respondsToSelector:@selector(updater:didFindValidUpdate:)])
		[[updater delegate] updater:updater didFindValidUpdate:updateItem];
	[self downloadUpdate];
}

- (void)didNotFindUpdate
{
	if ([[updater delegate] respondsToSelector:@selector(updaterDidNotFindUpdate:)])
		[[updater delegate] updaterDidNotFindUpdate:updater];
	[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SUNoUpdateError userInfo:[NSDictionary dictionaryWithObject:[NSString stringWithFormat:SULocalizedString(@"You already have the newest version of %@.", nil), [host name]] forKey:NSLocalizedDescriptionKey]]];
}

- (void)downloadUpdate
{
	NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[updateItem fileURL]];
	[request setValue:[updater userAgentString] forHTTPHeaderField:@"User-Agent"];
	download = [[NSURLDownload alloc] initWithRequest:request delegate:self];
}

- (void)download:(NSURLDownload *)d decideDestinationWithSuggestedFilename:(NSString *)name
{
	// If name ends in .txt, the server probably has a stupid MIME configuration. We'll give the developer the benefit of the doubt and chop that off.
	if ([[name pathExtension] isEqualToString:@"txt"])
		name = [name stringByDeletingPathExtension];

	// We create a temporary directory in /tmp and stick the file there.
	// Not using a GUID here because hdiutil (for DMGs) for some reason chokes on GUIDs. Too long? I really have no idea.
	NSString *prefix = [NSString stringWithFormat:@"%@ %@ Update", [host name], [host version]];
	NSString *tempDir = NSTemporaryDirectory();
	if (tempDir)
	{
		tempDir = [tempDir stringByAppendingPathComponent:prefix];
		unsigned int cnt = 1;
		while ([[NSFileManager defaultManager] fileExistsAtPath:tempDir] && cnt <= 999)
		{
			tempDir = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"%@ %u", prefix, cnt++]];
		}

#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
		BOOL success = [[NSFileManager defaultManager] createDirectoryAtPath:tempDir attributes:nil];
#else
		BOOL success = [[NSFileManager defaultManager] createDirectoryAtPath:tempDir withIntermediateDirectories:YES attributes:nil error:nil];
#endif
		if (!success)
		{
			// Okay, something's really broken with /tmp
			[download cancel];
			[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SUTemporaryDirectoryError userInfo:[NSDictionary dictionaryWithObject:[NSString stringWithFormat:@"Can't make a temporary directory for the update download at %@.",tempDir] forKey:NSLocalizedDescriptionKey]]];
		}

		downloadPath = [[tempDir stringByAppendingPathComponent:name] retain];
		[download setDestination:downloadPath allowOverwrite:YES];
	}
}

- (void)downloadDidFinish:(NSURLDownload *)d
{
	// New in Sparkle 1.5: we're now checking signatures on all non-secure downloads, where "secure" is defined as both the appcast and the download being transmitted over SSL.
	NSURL *downloadURL = [[d request] URL];
	if (!(([[downloadURL scheme] isEqualToString:@"https"] && [[appcastURL scheme] isEqualToString:@"https"]) ||
		  ([downloadURL isFileURL] && [appcastURL isFileURL])))
	{
		if (![host publicDSAKey] || ![SUDSAVerifier validatePath:downloadPath withEncodedDSASignature:[updateItem DSASignature] withPublicDSAKey:[host publicDSAKey]])
		{
			[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SUSignatureError userInfo:[NSDictionary dictionaryWithObjectsAndKeys:SULocalizedString(@"An error occurred while extracting the archive. Please try again later.", nil), NSLocalizedDescriptionKey, @"The update is improperly signed.", NSLocalizedFailureReasonErrorKey, nil]]];
			return;
		}
	}

	[self extractUpdate];
}

- (void)download:(NSURLDownload *)download didFailWithError:(NSError *)error
{
	// Get rid of what we've downloaded so far, if anything.
	if (downloadPath != nil)
		[[NSWorkspace sharedWorkspace] performFileOperation:NSWorkspaceRecycleOperation source:[downloadPath stringByDeletingLastPathComponent] destination:@"" files:[NSArray arrayWithObject:[downloadPath lastPathComponent]] tag:NULL];
	[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SURelaunchError userInfo:[NSDictionary dictionaryWithObjectsAndKeys:SULocalizedString(@"An error occurred while downloading the update. Please try again later.", nil), NSLocalizedDescriptionKey, [error localizedDescription], NSLocalizedFailureReasonErrorKey, nil]]];
}

- (BOOL)download:(NSURLDownload *)download shouldDecodeSourceDataOfMIMEType:(NSString *)encodingType
{
	// We don't want the download system to extract our gzips.
	// Note that we use a substring matching here instead of direct comparison because the docs say "application/gzip" but the system *uses* "application/x-gzip". This is a documentation bug.
	return ([encodingType rangeOfString:@"gzip"].location == NSNotFound);
}

- (void)extractUpdate
{
	SUUnarchiver *unarchiver = [SUUnarchiver unarchiverForPath:downloadPath updatingHost:host];
	if (!unarchiver)
	{
		NSLog(@"Sparkle Error: No valid unarchiver for %@!", downloadPath);
		[self unarchiverDidFail:nil];
		return;
	}
	CFRetain(unarchiver); // Manage this memory manually so we don't have to make it an IV.
	[unarchiver setDelegate:self];
	[unarchiver start];
}

- (void)failedToApplyDeltaUpdate
{
	// When a delta update fails to apply we fall back on updating via a full install.
	[updateItem release];
	updateItem = nonDeltaUpdateItem;
	nonDeltaUpdateItem = nil;

	[self downloadUpdate];
}

- (void)unarchiverDidFinish:(SUUnarchiver *)ua
{
	if (ua) { CFRelease(ua); }
	[self installUpdate];
}

- (void)unarchiverDidFail:(SUUnarchiver *)ua
{
	if (ua) { CFRelease(ua); }

	if ([updateItem isDeltaUpdate]) {
		[self failedToApplyDeltaUpdate];
		return;
	}

	[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SUUnarchivingError userInfo:[NSDictionary dictionaryWithObject:SULocalizedString(@"An error occurred while extracting the archive. Please try again later.", nil) forKey:NSLocalizedDescriptionKey]]];
}

- (BOOL)shouldInstallSynchronously { return NO; }

- (void)installUpdate
{
	if ([[updater delegate] respondsToSelector:@selector(updater:willInstallUpdate:)])
		[[updater delegate] updater:updater willInstallUpdate:updateItem];

	// Copy the relauncher into a temporary directory so we can get to it after the new version's installed.
	NSString *relaunchPathToCopy = [SPARKLE_BUNDLE pathForResource:@"relaunch" ofType:@""];
	NSString *targetPath = [NSTemporaryDirectory() stringByAppendingPathComponent:[relaunchPathToCopy lastPathComponent]];
	// Only the paranoid survive: if there's already a stray copy of relaunch there, we would have problems.
	NSError *error = nil;
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
    [[NSFileManager defaultManager] removeFileAtPath:targetPath handler:nil];
	if ([[NSFileManager defaultManager] copyPath:relaunchPathToCopy toPath:targetPath handler:nil])
#else
	[[NSFileManager defaultManager] removeItemAtPath:targetPath error:nil];
	if ([[NSFileManager defaultManager] copyItemAtPath:relaunchPathToCopy toPath:targetPath error:&error])
#endif
		relaunchPath = [targetPath retain];
	else
		[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SURelaunchError userInfo:[NSDictionary dictionaryWithObjectsAndKeys:SULocalizedString(@"An error occurred while extracting the archive. Please try again later.", nil), NSLocalizedDescriptionKey, [NSString stringWithFormat:@"Couldn't copy relauncher (%@) to temporary path (%@)! %@", relaunchPathToCopy, targetPath, (error ? [error localizedDescription] : @"")], NSLocalizedFailureReasonErrorKey, nil]]];

	[SUInstaller installFromUpdateFolder:[downloadPath stringByDeletingLastPathComponent] overHost:host delegate:self synchronously:[self shouldInstallSynchronously] versionComparator:[self versionComparator]];
}

- (void)installerFinishedForHost:(SUHost *)aHost
{
	if (aHost != host) { return; }
	[self relaunchHostApp];
}

- (void)relaunchHostApp
{
	// Give the host app an opportunity to postpone the relaunch.
	static BOOL postponedOnce = NO;
	if (!postponedOnce && [[updater delegate] respondsToSelector:@selector(updater:shouldPostponeRelaunchForUpdate:untilInvoking:)])
	{
		NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:[[self class] instanceMethodSignatureForSelector:@selector(relaunchHostApp)]];
		[invocation setSelector:@selector(relaunchHostApp)];
		[invocation setTarget:self];
		postponedOnce = YES;
		if ([[updater delegate] updater:updater shouldPostponeRelaunchForUpdate:updateItem untilInvoking:invocation])
			return;
	}

	[self cleanUp]; // Clean up the download and extracted files.

	[[NSNotificationCenter defaultCenter] postNotificationName:SUUpdaterWillRestartNotification object:self];
	if ([[updater delegate] respondsToSelector:@selector(updaterWillRelaunchApplication:)])
		[[updater delegate] updaterWillRelaunchApplication:updater];

	if(!relaunchPath || ![[NSFileManager defaultManager] fileExistsAtPath:relaunchPath])
	{
		// Note that we explicitly use the host app's name here, since updating plugin for Mail relaunches Mail, not just the plugin.
		[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SURelaunchError userInfo:[NSDictionary dictionaryWithObjectsAndKeys:[NSString stringWithFormat:SULocalizedString(@"An error occurred while relaunching %1$@, but the new version will be available next time you run %1$@.", nil), [host name]], NSLocalizedDescriptionKey, [NSString stringWithFormat:@"Couldn't find the relauncher (expected to find it at %@)", relaunchPath], NSLocalizedFailureReasonErrorKey, nil]]];
		// We intentionally don't abandon the update here so that the host won't initiate another.
		return;
	}

	NSString *pathToRelaunch = [host bundlePath];
	if ([[updater delegate] respondsToSelector:@selector(pathToRelaunchForUpdater:)])
		pathToRelaunch = [[updater delegate] pathToRelaunchForUpdater:updater];
	[NSTask launchedTaskWithLaunchPath:relaunchPath arguments:[NSArray arrayWithObjects:pathToRelaunch, [NSString stringWithFormat:@"%d", [[NSProcessInfo processInfo] processIdentifier]], nil]];

	[self setValue:[NSNumber numberWithBool:YES] forKey:@"finished"];
	[NSApp terminate:nil];
}

- (void)cleanUp
{
#if MAC_OS_X_VERSION_MIN_REQUIRED <= MAC_OS_X_VERSION_10_4
    [[NSFileManager defaultManager] removeFileAtPath:[downloadPath stringByDeletingLastPathComponent] handler:nil];
#else
	[[NSFileManager defaultManager] removeItemAtPath:[downloadPath stringByDeletingLastPathComponent] error:nil];
#endif
}

- (void)installerForHost:(SUHost *)aHost failedWithError:(NSError *)error
{
	if (aHost != host) { return; }
	[self abortUpdateWithError:[NSError errorWithDomain:SUSparkleErrorDomain code:SUInstallationError userInfo:[NSDictionary dictionaryWithObjectsAndKeys:SULocalizedString(@"An error occurred while installing the update. Please try again later.", nil), NSLocalizedDescriptionKey, [error localizedDescription], NSLocalizedFailureReasonErrorKey, nil]]];
}

- (void)abortUpdate
{
	[[NSNotificationCenter defaultCenter] removeObserver:self];
	[super abortUpdate];
}

- (void)abortUpdateWithError:(NSError *)error
{
	if ([error code] != SUNoUpdateError) // Let's not bother logging this.
		NSLog(@"Sparkle Error: %@", [error localizedDescription]);
	if ([error localizedFailureReason])
		NSLog(@"Sparkle Error (continued): %@", [error localizedFailureReason]);
	if (download)
		[download cancel];
	[self abortUpdate];
}

- (void)dealloc
{
	[updateItem release];
	[nonDeltaUpdateItem release];
	[download release];
	[downloadPath release];
	[relaunchPath release];
	[super dealloc];
}

@end
