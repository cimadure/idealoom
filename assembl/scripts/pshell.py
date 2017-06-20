import sys

from pyramid.util import DottedNameResolver
from pyramid.settings import aslist
from pyramid.scripts.pshell import PShellCommand


def main(argv=sys.argv, quiet=False):
    command = PShellCommandA(argv, quiet)
    try:
        return command.run()
    except:
        import pdb; pdb.post_mortem()


class PShellCommandA(PShellCommand):

    def pshell_file_config(self, filename):
        config = self.ConfigParser()
        config.optionxform = str
        config.read(filename)
        # Avoid DEFAULT section
        items = config._sections.get('pshell', None)
        if not items:
            return

        resolver = DottedNameResolver(None)
        self.loaded_objects = {}
        self.object_help = {}
        self.setup = None
        for k, v in items.iteritems():
            if k == '__name__':
                continue
            if k == 'setup':
                self.setup = v
            elif k == 'default_shell':
                self.preferred_shells = [x.lower() for x in aslist(v)]
            else:
                self.loaded_objects[k] = resolver.maybe_resolve(v)
                self.object_help[k] = v


if __name__ == '__main__':  # pragma: no cover
    sys.exit(main() or 0)
